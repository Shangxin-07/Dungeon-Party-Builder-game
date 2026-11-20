/**
 * Turn-based, fully automatic combat between a party and a group of monsters
 * (DESIGN.md §10). Deterministic: same seed + same party + same monsters gives
 * the same fight, move for move.
 *
 * The loop only knows about effect *types* (weaponAttack, dealDamage, heal,
 * applyStatus, summon). Classes, monsters, abilities and statuses are all data.
 */
import type {
  AbilityDef,
  ActiveEffect,
  DamageType,
  Derived,
  PassiveEffect,
  Row,
  StatBlock,
  Trigger,
} from "../content/types";
import { getAi, type Action, type BattleView } from "./ai";
import { heroSheet, type Hero } from "./hero";
import type { Index } from "./library";
import { createRng, type Rng } from "./rng";
import { bonusVsTags, computeDerived, resistance, type DerivedBlock } from "./stats";

export type Side = "party" | "monsters";

/** A creature taking part in a fight. */
export interface Fighter {
  uid: string;
  name: string;
  side: Side;
  row: Row;
  heroId?: string;
  monsterId?: string;
  stats: StatBlock;
  derived: DerivedBlock;
  passives: PassiveEffect[];
  skills: Record<string, number>;
  tags: string[];
  weapon: { name: string; damageType: DamageType; ranged: boolean };
  abilities: string[];
  ai: string;
  hp: number;
  mana: number;
  state: "up" | "downed" | "dead";
  /** Rounds a downed hero has left before dying. */
  bleed: number;
  statuses: { id: string; turns: number }[];
  pack: string[];
  triggers: readonly Trigger[];
  firedTriggers: Set<number>;
}

export type CombatEventKind =
  | "start"
  | "ambush"
  | "round"
  | "action"
  | "hit"
  | "miss"
  | "damage"
  | "heal"
  | "status"
  | "status-end"
  | "downed"
  | "killed"
  | "bleeding"
  | "died"
  | "revived"
  | "summon"
  | "end";

/** One line of the battle report. `hp` is the affected creature's HP afterwards. */
export interface CombatEvent {
  kind: CombatEventKind;
  round: number;
  text: string;
  actor?: string;
  target?: string;
  amount?: number;
  hp?: { uid: string; hp: number; max: number };
  /** Summon events: the new creature's name. */
  name?: string;
}

export interface CombatResult {
  winner: Side | "none";
  rounds: number;
  log: CombatEvent[];
  /** The party after the fight: HP, mana, used consumables and conditions updated. */
  party: Hero[];
  /** Ids of monsters killed (one entry per kill), for the population sim later. */
  kills: string[];
  /** Every creature as it ended the fight, for result screens. */
  fighters: Fighter[];
}

export interface CombatOptions {
  seed: number;
  /** Stop after this many rounds with no winner. */
  maxRounds?: number;
  /** The party scouted the monsters first: it gets a free opening round. */
  surprise?: boolean;
}

/** The basic weapon attack every fighter has. Not a content file, so "attack" is a reserved id. */
export const BASIC_ATTACK: AbilityDef = {
  id: "attack",
  name: "Attack",
  target: "enemy",
  tags: ["damage", "weapon"],
  effects: [{ type: "weaponAttack" }],
};

const BLEED_ROUNDS = 3;
const AMBUSH_BONUS = 50;
const MAX_ROUNDS = 40;

export function runCombat(
  ix: Index,
  party: readonly Hero[],
  monsterIds: readonly string[],
  opts: CombatOptions,
): CombatResult {
  return new Battle(ix, party, monsterIds, createRng(opts.seed), !!opts.surprise).run(
    opts.maxRounds ?? MAX_ROUNDS,
  );
}

class Battle {
  private fighters: Fighter[] = [];
  private log: CombatEvent[] = [];
  private round = 0;
  private kills: string[] = [];
  private nameCounts = new Map<string, number>();
  private ambushing = new Set<string>();
  private nextUid = 1;

  constructor(
    private ix: Index,
    private party: readonly Hero[],
    monsterIds: readonly string[],
    private rng: Rng,
    private surprise = false,
  ) {
    for (const hero of party) {
      if (hero.condition === "ok") this.fighters.push(this.fromHero(hero));
    }
    const totals = new Map<string, number>();
    for (const id of monsterIds) totals.set(id, (totals.get(id) ?? 0) + 1);
    for (const id of monsterIds)
      this.fighters.push(this.fromMonster(id, "monsters", totals.get(id)! > 1));
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  private fromHero(hero: Hero): Fighter {
    const sheet = heroSheet(this.ix, hero);
    const cls = this.ix.cls(hero.classId);
    const weaponDef = hero.equipment.weapon ? this.ix.item(hero.equipment.weapon) : undefined;
    return {
      uid: hero.id,
      name: hero.name,
      side: "party",
      row: hero.row,
      heroId: hero.id,
      stats: sheet.stats,
      derived: sheet.derived,
      passives: sheet.passives,
      skills: sheet.skills,
      tags: sheet.tags,
      weapon: weaponDef
        ? {
            name: weaponDef.name.toLowerCase(),
            damageType: weaponDef.damageType ?? "crushing",
            ranged: !!weaponDef.ranged,
          }
        : { name: "fists", damageType: "crushing", ranged: false },
      abilities: [...cls.abilities],
      ai: cls.ai,
      hp: Math.min(hero.hp, sheet.derived.maxHp),
      mana: Math.min(hero.mana, sheet.derived.mana),
      state: hero.hp > 0 ? "up" : "downed",
      bleed: BLEED_ROUNDS,
      statuses: [],
      pack: [...hero.pack],
      triggers: [],
      firedTriggers: new Set(),
    };
  }

  private fromMonster(id: string, side: Side, lettered: boolean): Fighter {
    const def = this.ix.monster(id);
    const passives = [...(def.passives ?? [])];
    const ranged = !!def.weapon.ranged;
    const derived = computeDerived(def.stats, passives, { ranged, overrides: def.overrides });
    derived.attack += def.weapon.attack;
    let name = def.name;
    if (lettered) {
      const n = this.nameCounts.get(id) ?? 0;
      this.nameCounts.set(id, n + 1);
      name = `${def.name} ${String.fromCharCode(65 + (n % 26))}`;
    }
    return {
      uid: `m${this.nextUid++}`,
      name,
      side,
      row: def.row,
      monsterId: def.id,
      stats: def.stats,
      derived,
      passives,
      skills: {},
      tags: [...def.tags],
      weapon: { name: def.weapon.name, damageType: def.weapon.damageType, ranged },
      abilities: [...(def.abilities ?? [])],
      ai: def.ai,
      hp: derived.maxHp,
      mana: derived.mana,
      state: "up",
      bleed: 0,
      statuses: [],
      pack: [],
      triggers: def.triggers ?? [],
      firedTriggers: new Set(),
    };
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  run(maxRounds: number): CombatResult {
    const names = (side: Side) =>
      this.fighters
        .filter((f) => f.side === side)
        .map((f) => f.name)
        .join(", ");
    this.emit({ kind: "start", text: `${names("party")} face ${names("monsters")}.` });

    if (this.surprise) this.partySurprise();
    else this.ambushCheck();

    let winner: Side | "none" = this.winner();
    while (winner === "none" && this.round < maxRounds) {
      this.round++;
      this.emit({ kind: "round", text: `Round ${this.round}` });
      for (const f of this.turnOrder()) {
        if (f.state !== "up") continue;
        this.takeTurn(f);
        if ((winner = this.winner()) !== "none") break;
      }
      if (winner === "none") this.bleedOut();
      winner = this.winner();
    }

    const text =
      winner === "party"
        ? "The party is victorious."
        : winner === "monsters"
          ? "The party has fallen."
          : "Neither side can finish the other. The fight breaks off.";
    this.emit({ kind: "end", text });

    return {
      winner,
      rounds: this.round,
      log: this.log,
      party: this.party.map((h) => this.heroAfter(h)),
      kills: this.kills,
      fighters: this.fighters,
    };
  }

  private heroAfter(hero: Hero): Hero {
    const f = this.fighters.find((x) => x.heroId === hero.id);
    if (!f) return { ...hero, pack: [...hero.pack] };
    return {
      ...hero,
      hp: f.hp,
      mana: f.mana,
      pack: [...f.pack],
      condition: f.state === "up" ? "ok" : f.state,
    };
  }

  private winner(): Side | "none" {
    const up = (side: Side) => this.fighters.some((f) => f.side === side && f.state === "up");
    if (!up("monsters")) return "party";
    if (!up("party")) return "monsters";
    return "none";
  }

  private turnOrder(): Fighter[] {
    return this.fighters
      .filter((f) => f.state === "up")
      .map((f) => ({ f, roll: this.stat(f, "initiative") + this.rng.int(0, 9) + this.rng.next() }))
      .sort((a, b) => b.roll - a.roll)
      .map((x) => x.f);
  }

  /**
   * Monsters tagged "ambusher" try to strike first. The party's best Scouting
   * gives the chance to spot them; if nobody does, the ambushers get a free
   * round with bonus damage.
   */
  private ambushCheck(): void {
    const ambushers = this.fighters.filter(
      (f) => f.side === "monsters" && f.tags.includes("ambusher"),
    );
    if (!ambushers.length) return;
    const party = this.fighters.filter((f) => f.side === "party" && f.state === "up");
    const best = party.reduce<Fighter | undefined>(
      (b, f) => (!b || (f.skills.scouting ?? 0) > (b.skills.scouting ?? 0) ? f : b),
      undefined,
    );
    const chance = (best?.skills.scouting ?? 0) / 100;
    if (best && this.rng.chance(chance)) {
      this.emit({
        kind: "ambush",
        actor: best.uid,
        text: `${best.name} spots ${ambushers[0]!.name} lying in wait.`,
      });
      return;
    }
    this.emit({ kind: "ambush", text: "Ambush! Something drops from the dark." });
    for (const f of ambushers) this.ambushing.add(f.uid);
    for (const f of ambushers) {
      if (f.state === "up" && this.winner() === "none") this.takeTurn(f, true);
    }
    this.ambushing.clear();
  }

  /** A scouted fight: every hero gets one free action, with the ambush bonus. */
  private partySurprise(): void {
    this.emit({ kind: "ambush", text: "The party catches them unawares and strikes first!" });
    const party = this.fighters.filter((f) => f.side === "party" && f.state === "up");
    for (const f of party) this.ambushing.add(f.uid);
    for (const f of party) {
      if (f.state === "up" && this.winner() === "none") this.takeTurn(f, true);
    }
    this.ambushing.clear();
  }

  private takeTurn(f: Fighter, skipStatuses = false): void {
    if (!skipStatuses) {
      this.tickStatuses(f);
      if (f.state !== "up") return;
    }
    const action = getAi(f.ai)(this.view(f));
    this.perform(f, action);
  }

  private bleedOut(): void {
    for (const f of this.fighters) {
      if (f.side !== "party" || f.state !== "downed") continue;
      f.bleed--;
      if (f.bleed <= 0) {
        f.state = "dead";
        this.emit({ kind: "died", target: f.uid, text: `${f.name} has bled out.` });
      } else {
        this.emit({
          kind: "bleeding",
          target: f.uid,
          text: `${f.name} is bleeding out (${f.bleed} ${f.bleed === 1 ? "round" : "rounds"} left).`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // AI view
  // -------------------------------------------------------------------------

  private view(self: Fighter): BattleView {
    return {
      self,
      allies: this.fighters.filter((f) => f.side === self.side && f.state !== "dead"),
      enemies: this.fighters.filter((f) => f.side !== self.side && f.state === "up"),
      ix: this.ix,
      rng: this.rng,
      abilities: () => [BASIC_ATTACK, ...self.abilities.map((id) => this.ix.ability(id))],
      canAfford: (a) => self.mana >= (a.cost ?? 0),
      targets: (a) => this.targetsFor(self, a),
    };
  }

  private targetsFor(self: Fighter, ability: AbilityDef): Fighter[] {
    switch (ability.target) {
      case "self":
        return [self];
      case "ally":
        return this.fighters.filter((f) => f.side === self.side && f.state !== "dead");
      case "all-enemies":
      case "enemy": {
        const enemies = this.fighters.filter((f) => f.side !== self.side && f.state === "up");
        // Melee weapon attacks can only reach the front row while it stands.
        const melee = ability.effects.some((e) => e.type === "weaponAttack") && !self.weapon.ranged;
        if (!melee || ability.target === "all-enemies") return enemies;
        const front = enemies.filter((f) => f.row === "front");
        return front.length ? front : enemies;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Actions and effects
  // -------------------------------------------------------------------------

  private perform(actor: Fighter, action: Action): void {
    if (action.kind === "wait") {
      this.emit({ kind: "action", actor: actor.uid, text: `${actor.name} hesitates.` });
      return;
    }
    const target = this.fighters.find((f) => f.uid === action.target);
    if (!target) return;

    if (action.kind === "item") {
      const idx = actor.pack.indexOf(action.item);
      if (idx < 0) return;
      actor.pack.splice(idx, 1);
      const item = this.ix.item(action.item);
      const who = target === actor ? "" : ` on ${target.name}`;
      this.emit({
        kind: "action",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} uses ${an(item.name)}${who}.`,
      });
      this.applyEffects(actor, target, item.use ?? [], false);
      return;
    }

    const ability = action.ability === "attack" ? BASIC_ATTACK : this.ix.ability(action.ability);
    actor.mana -= ability.cost ?? 0;
    const targets = ability.target === "all-enemies" ? this.targetsFor(actor, ability) : [target];
    const isBasic = ability === BASIC_ATTACK;
    if (!isBasic) {
      const aimed = ability.target === "enemy" || (ability.target === "ally" && target !== actor);
      const verb = ability.verb ?? `uses ${ability.name}`;
      const text = verb.includes("{target}")
        ? verb.replace("{target}", target.name)
        : `${verb}${aimed ? ` on ${target.name}` : ""}`;
      this.emit({
        kind: "action",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} ${text}.`,
      });
    }
    for (const t of targets) this.applyEffects(actor, t, ability.effects, isBasic);
  }

  /** Run effects in order. A missed weapon attack cancels the rest for that target. */
  private applyEffects(
    actor: Fighter,
    target: Fighter,
    effects: readonly ActiveEffect[],
    basic: boolean,
  ): void {
    for (const e of effects) {
      if (target.state === "dead") return;
      switch (e.type) {
        case "weaponAttack":
          if (!this.weaponAttack(actor, target, e.damagePercent ?? 0, basic)) return;
          break;
        case "dealDamage": {
          let amount = e.amount + (e.scale ?? 0) * this.stat(actor, "spellPower");
          amount *= 1 + bonusVsTags(this.passives(actor), target.tags) / 100;
          this.damage(target, Math.round(amount), e.damageType, false, actor);
          break;
        }
        case "heal":
          this.heal(target, Math.round(e.amount + (e.scale ?? 0) * this.stat(actor, "spellPower")));
          break;
        case "applyStatus":
          this.applyStatus(target, e.status, e.turns, e.chance ?? 1);
          break;
        case "summon":
          this.summon(actor, e.monster, e.count);
          break;
      }
    }
  }

  private weaponAttack(
    actor: Fighter,
    target: Fighter,
    extraPercent: number,
    basic: boolean,
  ): boolean {
    const hitChance = clamp(
      0.75 + (this.stat(actor, "accuracy") - this.stat(target, "evasion")) * 0.03,
      0.15,
      0.95,
    );
    const withWeapon = basic ? ` with ${actor.weapon.name}` : "";
    if (!this.rng.chance(hitChance)) {
      const text = basic
        ? `${actor.name} swings at ${target.name}${withWeapon} and misses.`
        : `${actor.name} misses.`;
      this.emit({ kind: "miss", actor: actor.uid, target: target.uid, text });
      return false;
    }
    const atk = this.stat(actor, "attack");
    let raw = this.rng.int(Math.ceil(atk / 2), atk);
    let percent = extraPercent + bonusVsTags(this.passives(actor), target.tags);
    if (this.ambushing.has(actor.uid)) percent += AMBUSH_BONUS;
    raw *= 1 + percent / 100;
    if (basic) {
      this.emit({
        kind: "hit",
        actor: actor.uid,
        target: target.uid,
        text: `${actor.name} hits ${target.name}${withWeapon}.`,
      });
    }
    this.damage(target, Math.round(raw), actor.weapon.damageType, true, actor);
    return true;
  }

  private damage(
    target: Fighter,
    raw: number,
    type: DamageType,
    armored: boolean,
    source?: Fighter,
  ): void {
    const resist = resistance(this.passives(target), type);
    let amount = raw * (1 - resist / 100);
    if (armored) amount -= this.stat(target, "armor");
    amount = resist >= 100 ? 0 : Math.max(1, Math.round(amount));
    let note = "";
    if (resist >= 100) note = " (immune)";
    else if (resist > 0) note = " (resisted)";
    else if (resist < 0) note = " (weak spot!)";
    if (source && this.ambushing.has(source.uid)) note += " (ambush!)";
    if (amount === 0) {
      this.emit({
        kind: "damage",
        target: target.uid,
        amount: 0,
        text: `${target.name} shrugs it off${note}.`,
        hp: this.hp(target),
      });
      return;
    }
    target.hp = Math.max(0, target.hp - amount);
    this.emit({
      kind: "damage",
      target: target.uid,
      amount,
      text: `${target.name} takes ${amount} ${type} damage${note}.`,
      hp: this.hp(target),
    });

    if (target.hp === 0) {
      if (target.side === "party") {
        target.state = "downed";
        target.bleed = BLEED_ROUNDS;
        target.statuses = [];
        this.emit({ kind: "downed", target: target.uid, text: `${target.name} goes down!` });
      } else {
        target.state = "dead";
        if (target.monsterId) this.kills.push(target.monsterId);
        this.emit({ kind: "killed", target: target.uid, text: `${target.name} is slain.` });
      }
    }
    this.fireTriggers(target, amount);
  }

  private fireTriggers(f: Fighter, amount: number): void {
    f.triggers.forEach((t, i) => {
      if (t.on !== "damaged") return;
      if (t.once && f.firedTriggers.has(i)) return;
      if (t.minDamage !== undefined && amount < t.minDamage) return;
      if (t.ifAlive && f.state !== "up") return;
      f.firedTriggers.add(i);
      if (t.message)
        this.emit({ kind: "action", actor: f.uid, text: t.message.replace("{self}", f.name) });
      this.applyEffects(f, f, t.effects, false);
    });
  }

  private heal(target: Fighter, amount: number): void {
    const before = target.hp;
    target.hp = Math.min(target.derived.maxHp, target.hp + amount);
    const gained = target.hp - before;
    if (target.state === "downed" && target.hp > 0) {
      target.state = "up";
      target.bleed = BLEED_ROUNDS;
      this.emit({
        kind: "revived",
        target: target.uid,
        amount: gained,
        text: `${target.name} is back on their feet (+${gained} HP).`,
        hp: this.hp(target),
      });
      return;
    }
    this.emit({
      kind: "heal",
      target: target.uid,
      amount: gained,
      text: `${target.name} recovers ${gained} HP.`,
      hp: this.hp(target),
    });
  }

  private applyStatus(target: Fighter, id: string, turns: number, chance: number): void {
    if (target.state !== "up") return;
    const status = this.ix.status(id);
    // Willpower shrugs off some effects: each point of resist is -1% chance.
    if (!this.rng.chance(chance * (1 - this.stat(target, "resist") / 100))) return;
    const existing = target.statuses.find((s) => s.id === id);
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else target.statuses.push({ id, turns });
    this.emit({
      kind: "status",
      target: target.uid,
      text: `${target.name} is ${status.name.toLowerCase()}.`,
    });
  }

  private tickStatuses(f: Fighter): void {
    for (const s of [...f.statuses]) {
      const def = this.ix.status(s.id);
      if (def.perTurn) this.applyEffects(f, f, def.perTurn, false);
      if (f.state !== "up") return;
      s.turns--;
      if (s.turns <= 0) {
        f.statuses = f.statuses.filter((x) => x !== s);
        this.emit({
          kind: "status-end",
          target: f.uid,
          text: `${f.name} is no longer ${def.name.toLowerCase()}.`,
        });
      }
    }
  }

  private summon(actor: Fighter, monsterId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const f = this.fromMonster(monsterId, actor.side, true);
      this.fighters.push(f);
      this.emit({
        kind: "summon",
        actor: actor.uid,
        target: f.uid,
        text: `${f.name} joins the fight.`,
        hp: this.hp(f),
        name: f.name,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Small helpers
  // -------------------------------------------------------------------------

  /** Passives from the creature itself plus its current statuses. */
  private passives(f: Fighter): PassiveEffect[] {
    if (!f.statuses.length) return f.passives;
    return [...f.passives, ...f.statuses.flatMap((s) => this.ix.status(s.id).passives ?? [])];
  }

  /** A secondary stat including temporary status effects. */
  private stat(f: Fighter, key: Derived): number {
    let v = f.derived[key];
    for (const s of f.statuses) {
      for (const p of this.ix.status(s.id).passives ?? []) {
        if (p.type === "modifyStat" && p.stat === key) v += p.amount;
      }
    }
    return v;
  }

  private hp(f: Fighter) {
    return { uid: f.uid, hp: f.hp, max: f.derived.maxHp };
  }

  private emit(e: Omit<CombatEvent, "round">): void {
    this.log.push({ round: this.round, ...e });
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);
