/**
 * The fight's state and the fighters on the field: heroes, monsters and the
 * risen as fighters, their stats mid-fight, and the log. The other layers
 * build on this: effects.ts (what abilities do), battle.ts (turns and the
 * fight from start to finish).
 */
import type { Derived, FloorGround, PassiveEffect } from "../../content/types";
import { knownAbilityIds } from "../abilities";
import { risenAi, risenSheet } from "../fallen";
import { heroSheet, offhandWeapon, weaponAttackBonus, type Hero } from "../hero";
import type { Index } from "../library";
import { type Rng } from "../rng";
import { computeDerived } from "../stats";
import { type Side, type Fighter, type CombatEvent, type Tone } from "./types";

/**
 * Rounds a downed hero lasts before bleeding out, unless someone heals them.
 * 2 since M7.06 (was 3): a hero who goes down mid-fight needs help quickly.
 */
export const BLEED_ROUNDS = 2;

/** Extra damage, in percent, for a fighter who is ambushing. */
export const AMBUSH_BONUS = 50;

/** A fight that runs this long ends with nobody winning. */
export const MAX_ROUNDS = 40;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const an = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

/** Fighters, stats and the log. Extended by BattleEffects, then Battle. */
export class BattleBase {
  protected fighters: Fighter[] = [];
  protected log: CombatEvent[] = [];
  protected round = 0;
  protected kills: string[] = [];
  protected risenSlain: string[] = [];
  protected nameCounts = new Map<string, number>();
  protected ambushing = new Set<string>();
  protected nextUid = 1;
  /** Whether the party's back row is currently open to melee (so we warn once). */
  protected exposed = false;
  /** How far the guild has researched each monster (M7.07): monster id -> tier. */
  protected research: Readonly<Record<string, number>> = {};
  /** The monster the party ran from, if it ran (M7.07). */
  protected fledFrom?: string;

  constructor(
    protected ix: Index,
    protected party: readonly Hero[],
    monsterIds: readonly string[],
    protected rng: Rng,
    protected surprise = false,
    protected noBleeding = false,
    carrying?: { index: number; item: string },
    protected level = 1,
    risen: readonly Hero[] = [],
    /** The party's leader (M7.05): cunning monsters go for them first. */
    protected leaderId?: string,
  ) {
    for (const hero of party) {
      if (hero.condition === "ok") this.fighters.push(this.fromHero(hero));
    }
    const totals = new Map<string, number>();
    for (const id of monsterIds) totals.set(id, (totals.get(id) ?? 0) + 1);
    monsterIds.forEach((id, i) => {
      const item = carrying?.index === i ? carrying.item : undefined;
      this.fighters.push(this.fromMonster(id, "monsters", totals.get(id)! > 1, item));
    });
    for (const r of risen) this.fighters.push(this.fromRisen(r));
  }

  /** A risen hero: their own class, perks and gear, with the undead transform on top. */
  protected fromRisen(hero: Hero): Fighter {
    const f = this.fromHero(hero);
    const sheet = risenSheet(this.ix, hero);
    return {
      ...f,
      uid: `r${this.nextUid++}`,
      side: "monsters",
      heroId: undefined,
      risenId: hero.id,
      stats: sheet.stats,
      derived: sheet.derived,
      passives: sheet.passives,
      skills: sheet.skills,
      tags: sheet.tags,
      ai: risenAi(this.ix, hero),
      hp: sheet.derived.maxHp,
      mana: sheet.derived.mana,
      state: "up",
      bleed: 0,
      pack: [],
    };
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  protected fromHero(hero: Hero): Fighter {
    const sheet = heroSheet(this.ix, hero);
    const cls = this.ix.cls(hero.classId);
    const weaponDef = hero.equipment.weapon ? this.ix.item(hero.equipment.weapon) : undefined;
    const off = offhandWeapon(this.ix, hero);
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
      tags: hero.id === this.leaderId ? [...sheet.tags, "leader"] : sheet.tags,
      weapon: weaponDef
        ? {
            name: weaponDef.name.toLowerCase(),
            damageType: weaponDef.damageType ?? "crushing",
            ranged: !!weaponDef.ranged,
            reach: weaponDef.tags.includes("reach"),
          }
        : { name: "fists", damageType: "crushing", ranged: false },
      offhand: off
        ? {
            name: off.item.name.toLowerCase(),
            damageType: off.item.damageType ?? "crushing",
            damagePercent: off.damagePercent,
            attackDelta: weaponAttackBonus(off.item) - weaponAttackBonus(weaponDef),
          }
        : undefined,
      abilities: knownAbilityIds(this.ix, hero),
      cooldowns: {},
      used: {},
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

  protected fromMonster(id: string, side: Side, lettered: boolean, carried?: string): Fighter {
    const def = this.ix.monster(id);
    const item = carried ? this.ix.item(carried) : undefined;
    const passives = [...(def.passives ?? []), ...(item?.passives ?? [])];
    const ranged = !!def.weapon.ranged;
    const wields = item?.slot === "weapon" && !item.ranged;
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
      weapon: wields
        ? { name: item.name.toLowerCase(), damageType: item.damageType ?? "crushing", ranged }
        : { name: def.weapon.name, damageType: def.weapon.damageType, ranged },
      abilities: Object.entries(def.abilities ?? {})
        .filter(([, level]) => level <= this.level)
        .map(([id]) => id),
      cooldowns: {},
      used: {},
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

  protected heroAfter(hero: Hero): Hero {
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

  protected winner(): Side | "none" {
    const up = (side: Side) => this.fighters.some((f) => f.side === side && f.state === "up");
    if (!up("monsters")) return "party";
    if (!up("party")) return "monsters";
    return "none";
  }

  // -------------------------------------------------------------------------
  // Research (M7.07, DESIGN.md §17.7)
  // -------------------------------------------------------------------------

  /** Use what the guild has learnt about the monsters (see CombatOptions.research). */
  useResearch(research: Readonly<Record<string, number>> | undefined): this {
    this.research = research ?? {};
    return this;
  }

  /** The floor's fighting ground (§21): passives on each side for the whole fight. */
  protected ground?: FloorGround;
  onGround(ground: FloorGround | undefined): this {
    this.ground = ground;
    return this;
  }

  /** Ties between heroes (M8.32): extra passives by hero id. */
  protected bonds: Readonly<Record<string, readonly PassiveEffect[]>> = {};
  withBonds(bonds: Readonly<Record<string, readonly PassiveEffect[]>> | undefined): this {
    this.bonds = bonds ?? {};
    return this;
  }

  /** Passives from where and with whom this fighter fights: the ground and their ties. */
  private groundFor(f: Fighter): readonly PassiveEffect[] {
    const bond = (f.heroId && f.side === "party" && this.bonds[f.heroId]) || [];
    if (!this.ground) return bond;
    const side = (f.side === "party" ? this.ground.heroes : this.ground.monsters) ?? [];
    return bond.length ? [...side, ...bond] : side;
  }

  /** The guild's research tier on this fighter's kind of monster (0 for anyone else). */
  protected tierOf(f: Fighter): number {
    return f.monsterId ? (this.research[f.monsterId] ?? 0) : 0;
  }

  /** The ward that keeps this fighter from being hurt at all, unless research has broken it. */
  protected wardOf(f: Fighter): string | undefined {
    const ward = f.monsterId ? this.ix.monster(f.monsterId).ward : undefined;
    return ward && this.tierOf(f) < ward.tier ? ward.name : undefined;
  }

  // -------------------------------------------------------------------------
  // Small helpers
  // -------------------------------------------------------------------------

  /** Passives from the creature itself plus its current statuses. */
  protected passives(f: Fighter): PassiveEffect[] {
    const ground = this.groundFor(f);
    if (!f.statuses.length && !ground.length) return f.passives;
    return [
      ...f.passives,
      ...ground,
      ...f.statuses.flatMap((s) => this.ix.status(s.id).passives ?? []),
    ];
  }

  /** A secondary stat including temporary status effects. */
  protected stat(f: Fighter, key: Derived): number {
    let v = f.derived[key];
    for (const p of this.groundFor(f)) if (p.type === "modifyStat" && p.stat === key) v += p.amount;
    for (const s of f.statuses) {
      for (const p of this.ix.status(s.id).passives ?? []) {
        if (p.type === "modifyStat" && p.stat === key) v += p.amount;
      }
    }
    return v;
  }

  protected hp(f: Fighter) {
    return { uid: f.uid, hp: f.hp, max: f.derived.maxHp };
  }

  protected emit(e: Omit<CombatEvent, "round">): void {
    const tone = "tone" in e ? e.tone : this.toneOf(e);
    const { tone: _, ...rest } = e;
    this.log.push({ round: this.round, ...rest, ...(tone ? { tone } : {}) });
  }

  /** Is this line good or bad news for the party? Judged by whose side the actor or target is on. */
  protected toneOf(e: Omit<CombatEvent, "round">): Tone | undefined {
    const side = (uid?: string) => this.fighters.find((f) => f.uid === uid)?.side;
    const forParty = (s?: Side): Tone | undefined =>
      s === "party" ? "good" : s === "monsters" ? "bad" : undefined;
    const against = (s?: Side): Tone | undefined =>
      s === "party" ? "bad" : s === "monsters" ? "good" : undefined;
    switch (e.kind) {
      case "hit":
      case "summon":
        return forParty(side(e.actor));
      case "heal":
      case "revived":
        return forParty(side(e.target));
      case "damage":
        return e.amount ? against(side(e.target)) : undefined;
      case "downed":
      case "killed":
      case "bleeding":
      case "died":
        return against(side(e.target));
      default:
        return undefined;
    }
  }
}
