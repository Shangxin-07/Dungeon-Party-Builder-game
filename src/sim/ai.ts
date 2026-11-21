/**
 * Combat AIs. Each class and monster names an AI by id; the combat loop asks
 * it for an action on each turn. To add a new behaviour, register a function
 * here (or from anywhere with registerAi) and reference its id from content.
 * The combat loop never needs to change.
 */
import type { AbilityDef } from "../content/types";
import type { Fighter } from "./combat";
import type { Index } from "./library";
import type { Rng } from "./rng";

export type Action =
  | { kind: "ability"; ability: string; target: string }
  | { kind: "item"; item: string; target: string }
  | { kind: "wait" };

/** What an AI can see and ask about on its turn. */
export interface BattleView {
  readonly self: Fighter;
  /** Same side, any state except dead (includes self). */
  readonly allies: readonly Fighter[];
  /** Other side, standing only. */
  readonly enemies: readonly Fighter[];
  readonly ix: Index;
  readonly rng: Rng;
  /** Abilities this fighter knows, plus the basic "attack". */
  abilities(): AbilityDef[];
  /** Ready to use: enough mana, off cooldown, not used up for this fight. */
  canAfford(ability: AbilityDef): boolean;
  /** Fighters this ability could be aimed at right now. */
  targets(ability: AbilityDef): Fighter[];
}

export type Ai = (view: BattleView) => Action;

const registry = new Map<string, Ai>();

export function registerAi(id: string, ai: Ai): void {
  registry.set(id, ai);
}
export function getAi(id: string): Ai {
  const ai = registry.get(id);
  if (!ai) throw new Error(`Unknown AI id "${id}"`);
  return ai;
}
export function hasAi(id: string): boolean {
  return registry.has(id);
}

// ---------------------------------------------------------------------------
// Helpers shared by the built-in AIs
// ---------------------------------------------------------------------------

const hpFraction = (f: Fighter) => f.hp / f.derived.maxHp;

function lowest<T>(items: readonly T[], score: (t: T) => number): T | undefined {
  let best: T | undefined;
  for (const t of items) if (best === undefined || score(t) < score(best)) best = t;
  return best;
}

function attack(view: BattleView, choose: (targets: Fighter[]) => Fighter | undefined): Action {
  const basic = view.abilities().find((a) => a.id === "attack")!;
  const target = choose(view.targets(basic));
  return target ? { kind: "ability", ability: "attack", target: target.uid } : { kind: "wait" };
}

/** Drink a healing consumable if HP is below the threshold. */
function healSelfWithItem(view: BattleView, threshold: number): Action | undefined {
  const { self, ix } = view;
  if (hpFraction(self) >= threshold) return undefined;
  const item = self.pack.find((id) => {
    const def = ix.item(id);
    return def.slot === "consumable" && def.use?.some((e) => e.type === "heal");
  });
  return item ? { kind: "item", item, target: self.uid } : undefined;
}

const byTag = (view: BattleView, tag: string) =>
  view.abilities().filter((a) => a.tags.includes(tag) && view.canAfford(a));

/** Most expensive first: the bigger spell is usually the better one. */
const priciest = (abilities: AbilityDef[]) =>
  [...abilities].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));

const statusesOf = (a: AbilityDef) =>
  a.effects.flatMap((e) => (e.type === "applyStatus" ? [e.status] : []));

const hurts = (a: AbilityDef) =>
  a.effects.some((e) => e.type === "weaponAttack" || e.type === "dealDamage");

/** A once-a-fight pick-me-up such as Second Wind (tag "recover"), when hurt. */
function recover(view: BattleView, threshold: number): Action | undefined {
  if (hpFraction(view.self) >= threshold) return undefined;
  const a = byTag(view, "recover").find((x) => x.target === "self");
  return a ? { kind: "ability", ability: a.id, target: view.self.uid } : undefined;
}

/**
 * Martial techniques (tag "martial"), from the class list or the weapon in
 * hand: a sweeping attack if two or more foes are in reach, otherwise one of
 * the ready moves at random. Moves that only weaken (Mark Prey) go on the
 * biggest foe not already suffering it; moves that hurt use `choose`.
 */
function technique(
  view: BattleView,
  choose: (targets: Fighter[]) => Fighter | undefined,
): Action | undefined {
  const moves = byTag(view, "martial").filter(
    (a) => a.target !== "self" && !a.tags.includes("recover"),
  );
  const sweep = moves.find((a) => a.target === "all-enemies" && view.targets(a).length >= 2);
  if (sweep) return { kind: "ability", ability: sweep.id, target: view.targets(sweep)[0]!.uid };
  const single = moves.filter((a) => a.target === "enemy");
  if (!single.length) return undefined;
  const move = view.rng.pick(single);
  const fresh = (f: Fighter) => !statusesOf(move).some((s) => f.statuses.some((x) => x.id === s));
  const targets = view.targets(move).filter(fresh);
  const target = hurts(move) ? choose(targets) : lowest(targets, (f) => -f.hp);
  return target ? { kind: "ability", ability: move.id, target: target.uid } : undefined;
}

// ---------------------------------------------------------------------------
// Built-in AIs
// ---------------------------------------------------------------------------

/** Monsters: sometimes use a special ability, otherwise hit someone in reach. */
registerAi("brute", (view) => {
  const { self, rng } = view;
  // A leader's war cry, once there's someone to rally.
  const rally = byTag(view, "rally")[0];
  if (rally && view.allies.filter((a) => a.state === "up").length >= 2)
    return { kind: "ability", ability: rally.id, target: self.uid };
  const summon = byTag(view, "summon")[0];
  if (summon && rng.chance(0.5)) return { kind: "ability", ability: summon.id, target: self.uid };
  const specials = view
    .abilities()
    .filter(
      (a) =>
        a.id !== "attack" &&
        a.target === "enemy" &&
        (a.tags.includes("damage") || a.tags.includes("debuff")) &&
        view.canAfford(a),
    );
  if (specials.length && view.rng.chance(0.5)) {
    const ability = view.rng.pick(specials);
    const targets = view.targets(ability);
    if (targets.length)
      return { kind: "ability", ability: ability.id, target: view.rng.pick(targets).uid };
  }
  return attack(view, (t) => (t.length ? view.rng.pick(t) : undefined));
});

/**
 * Spells for heroes whose main style isn't casting (a Fighter with Mage levels,
 * DESIGN.md §9): pull a downed friend back up, or cast a damage spell after
 * techniques, an area one on a group. Heroes with no spells skip all this.
 */
function rescueSpell(view: BattleView): Action | undefined {
  if (!view.allies.some((a) => a.state === "downed")) return undefined;
  return healSomeone(view, 0);
}
function damageSpell(view: BattleView, choose: (t: Fighter[]) => Fighter | undefined) {
  const spells = priciest(byTag(view, "spell").filter((a) => a.tags.includes("damage")));
  const aoe = spells.find((a) => a.target === "all-enemies");
  if (aoe && view.enemies.length >= 2)
    return { kind: "ability", ability: aoe.id, target: view.enemies[0]!.uid } as Action;
  const single = spells.find((a) => a.target === "enemy");
  const target = single && choose(view.targets(single));
  return target
    ? ({ kind: "ability", ability: single!.id, target: target.uid } as Action)
    : undefined;
}

/** Front-liners: go for the biggest threat in reach. */
registerAi("fighter", (view) => {
  const threat = (t: Fighter[]) => lowest(t, (f) => -f.derived.attack);
  return (
    recover(view, 0.35) ??
    healSelfWithItem(view, 0.35) ??
    rescueSpell(view) ??
    technique(view, threat) ??
    damageSpell(view, threat) ??
    attack(view, threat)
  );
});

/** Ranged: pick off the most wounded enemy. */
registerAi("archer", (view) => {
  const weakest = (t: Fighter[]) => lowest(t, (f) => f.hp);
  return (
    recover(view, 0.35) ??
    healSelfWithItem(view, 0.35) ??
    rescueSpell(view) ??
    technique(view, weakest) ??
    damageSpell(view, weakest) ??
    attack(view, weakest)
  );
});

/** Heal a group if two or more are hurt, else the worst-off (downed first). */
function healSomeone(view: BattleView, below: number): Action | undefined {
  const { allies } = view;
  const heals = priciest(byTag(view, "heal"));
  const hurt = allies.filter((a) => a.state === "up" && hpFraction(a) < below);
  const group = heals.find((a) => a.target === "all-allies");
  if (group && hurt.length >= 2)
    return { kind: "ability", ability: group.id, target: hurt[0]!.uid };
  const heal = heals.find((a) => a.target === "ally");
  if (!heal) return undefined;
  const patient = allies.find((a) => a.state === "downed") ?? lowest(hurt, hpFraction);
  return patient ? { kind: "ability", ability: heal.id, target: patient.uid } : undefined;
}

/** Mana to keep back for one single-target heal. */
const healReserve = (view: BattleView) =>
  view.abilities().find((a) => a.tags.includes("heal") && a.target === "ally")?.cost ?? 0;

/** Casters: heal first, then area spells on groups, then single-target spells. */
registerAi("caster", (view) => {
  const { self, enemies } = view;
  const healing = healSomeone(view, 0.45);
  if (healing) return healing;
  const drink = healSelfWithItem(view, 0.3);
  if (drink) return drink;

  // Keep enough mana back for one heal.
  const reserve = healReserve(view);
  const spare = (a: AbilityDef) => self.mana - (a.cost ?? 0) >= reserve;
  const damage = priciest(
    byTag(view, "spell").filter((a) => a.tags.includes("damage") && spare(a)),
  );

  const aoe = damage.find((a) => a.target === "all-enemies");
  if (aoe && enemies.length >= 2)
    return { kind: "ability", ability: aoe.id, target: enemies[0]!.uid };

  const single = damage.find((a) => a.target === "enemy");
  if (single) {
    const target = lowest(view.targets(single), (f) => f.hp);
    if (target) return { kind: "ability", ability: single.id, target: target.uid };
  }
  const weakest = (t: Fighter[]) => lowest(t, (f) => f.hp);
  return technique(view, weakest) ?? attack(view, weakest);
});

/**
 * Healers: keep the party standing. Heal earlier than a mage does, save
 * spells for the undead (or a full mana pool), and otherwise swing a weapon.
 */
registerAi("healer", (view) => {
  const { self } = view;
  const healing = healSomeone(view, 0.6);
  if (healing) return healing;
  const drink = healSelfWithItem(view, 0.3);
  if (drink) return drink;

  const healCost = healReserve(view);
  const flush = self.mana >= self.derived.mana * 0.75;
  const spell = byTag(view, "spell").find(
    (a) =>
      a.tags.includes("damage") &&
      a.target === "enemy" &&
      self.mana - (a.cost ?? 0) >= healCost * 2,
  );
  if (spell) {
    const targets = view.targets(spell);
    const undead = lowest(
      targets.filter((t) => t.tags.includes("undead")),
      (f) => f.hp,
    );
    const target = undead ?? (flush ? lowest(targets, (f) => f.hp) : undefined);
    if (target) return { kind: "ability", ability: spell.id, target: target.uid };
  }
  const weakest = (t: Fighter[]) => lowest(t, (f) => f.hp);
  return technique(view, weakest) ?? attack(view, weakest);
});
