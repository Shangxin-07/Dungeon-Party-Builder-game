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
  /** Enough mana for it? */
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

// ---------------------------------------------------------------------------
// Built-in AIs
// ---------------------------------------------------------------------------

/** Monsters: sometimes use a special ability, otherwise hit someone in reach. */
registerAi("brute", (view) => {
  const specials = byTag(view, "damage").filter((a) => a.id !== "attack");
  if (specials.length && view.rng.chance(0.5)) {
    const ability = view.rng.pick(specials);
    const targets = view.targets(ability);
    if (targets.length)
      return { kind: "ability", ability: ability.id, target: view.rng.pick(targets).uid };
  }
  return attack(view, (t) => (t.length ? view.rng.pick(t) : undefined));
});

/** Front-liners: go for the biggest threat in reach. */
registerAi("fighter", (view) => {
  return healSelfWithItem(view, 0.35) ?? attack(view, (t) => lowest(t, (f) => -f.derived.attack));
});

/** Ranged: pick off the most wounded enemy. */
registerAi("archer", (view) => {
  return healSelfWithItem(view, 0.35) ?? attack(view, (t) => lowest(t, (f) => f.hp));
});

/** Casters: heal first, then area spells on groups, then single-target spells. */
registerAi("caster", (view) => {
  const { self, allies, enemies } = view;
  const heals = byTag(view, "heal");
  const heal = heals[0];
  if (heal) {
    const downed = allies.find((a) => a.state === "downed");
    const hurt = lowest(
      allies.filter((a) => a.state === "up" && hpFraction(a) < 0.45),
      hpFraction,
    );
    const patient = downed ?? hurt;
    if (patient) return { kind: "ability", ability: heal.id, target: patient.uid };
  }
  const drink = healSelfWithItem(view, 0.3);
  if (drink) return drink;

  // Keep enough mana back for one heal.
  const reserve = view.abilities().find((a) => a.tags.includes("heal"))?.cost ?? 0;
  const spare = (a: AbilityDef) => self.mana - (a.cost ?? 0) >= reserve;
  const damage = byTag(view, "damage").filter((a) => a.id !== "attack" && spare(a));

  const aoe = damage.find((a) => a.target === "all-enemies");
  if (aoe && enemies.length >= 2)
    return { kind: "ability", ability: aoe.id, target: enemies[0]!.uid };

  const single = damage.find((a) => a.target === "enemy");
  if (single) {
    const target = lowest(view.targets(single), (f) => f.hp);
    if (target) return { kind: "ability", ability: single.id, target: target.uid };
  }
  return attack(view, (t) => lowest(t, (f) => f.hp));
});

/**
 * Healers: keep the party standing. Heal earlier than a mage does, save
 * spells for the undead (or a full mana pool), and otherwise swing a weapon.
 */
registerAi("healer", (view) => {
  const { self, allies } = view;
  const heal = byTag(view, "heal")[0];
  if (heal) {
    const downed = allies.find((a) => a.state === "downed");
    const hurt = lowest(
      allies.filter((a) => a.state === "up" && hpFraction(a) < 0.6),
      hpFraction,
    );
    const patient = downed ?? hurt;
    if (patient) return { kind: "ability", ability: heal.id, target: patient.uid };
  }
  const drink = healSelfWithItem(view, 0.3);
  if (drink) return drink;

  const healCost = view.abilities().find((a) => a.tags.includes("heal"))?.cost ?? 0;
  const flush = self.mana >= self.derived.mana * 0.75;
  const spell = byTag(view, "damage").find(
    (a) => a.id !== "attack" && a.target === "enemy" && self.mana - (a.cost ?? 0) >= healCost * 2,
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
  return attack(view, (t) => lowest(t, (f) => f.hp));
});
