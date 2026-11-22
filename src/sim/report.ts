/**
 * The scouting report (M6): what the guild knows about a floor before the
 * party goes down, and where this party looks weak against it. Floors favour
 * different monsters (EncounterDef.weightOn), so the right party changes with
 * the floor. Everything here is worked out from content; nothing is rolled.
 */
import type { DamageType } from "../content/types";
import { knownAbilities } from "./abilities";
import { floorOdds } from "./encounter";
import { heroSheet, type Hero } from "./hero";
import { mainClass } from "./levels";
import type { Index } from "./library";
import { knownMonsters, monsterTier, theName } from "./research";
import { computeDerived } from "./stats";
import type { TownState } from "./town";

export { knownMonsters } from "./research";

/** Below this best Scouting, ambushers will usually strike first. */
export const SCOUTING_FAIR = 55;

export interface ReportMonster {
  monster: string;
  /** Share of the monster groups on this floor that include one, 0-1. */
  share: number;
  /** Has anyone in the guild met one? Unknown monsters are shown as "???". */
  known: boolean;
  /** How far the Library has got with it (M7.07): 0 unknown, 1 met, 2 Studied, 3 Mastered. */
  tier: number;
  /**
   * Damage types it takes extra from (only once Studied, M7.07: meeting one
   * shows what it shrugs off, study finds the weak spots), and ones it
   * shrugs off (≥ 50%).
   */
  weakTo: DamageType[];
  shrugsOff: DamageType[];
  ambusher: boolean;
  /** Its tricks in words, once Studied (M7.07). */
  tricks?: string;
  /** A ward nothing gets through yet (M7.07): the guild hasn't researched it far enough. */
  ward?: string;
}

export interface ScoutingReport {
  floor: number;
  monsters: ReportMonster[];
  /** Plain-words worries about this party on this floor. */
  warnings: string[];
}

/** The damage types a hero can deal: their weapon, and their spells. */
export function damageTypes(ix: Index, hero: Hero): Set<DamageType> {
  const out = new Set<DamageType>();
  const w = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  out.add(w?.damageType ?? "crushing");
  for (const { ability } of knownAbilities(ix, hero))
    for (const e of ability.effects) if (e.type === "dealDamage") out.add(e.damageType);
  return out;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A front-row hero whose armour stops less than this share of a usual hit gets a warning. */
export const ARMOUR_STOPS_FAIR = 1 / 3;
/** A weapon fighter who needs more than this many hits to fell a usual foe gets a warning. */
export const BLOWS_FAIR = 4;

/**
 * What a floor usually throws at a party (M7.06): the size of a usual hit
 * (the average weapon hit is ¾ of attack), and a usual monster's armour and
 * HP, weighted by how often each monster turns up there.
 */
export function floorThreat(ix: Index, floor: number): { hit: number; armor: number; hp: number } {
  const odds = floorOdds(ix, floor).filter((o) => !ix.monster(o.monster).summonOnly);
  let total = 0;
  let attack = 0;
  let armor = 0;
  let hp = 0;
  for (const { monster, share } of odds) {
    const def = ix.monster(monster);
    const d = computeDerived(def.stats, def.passives ?? [], {
      ranged: !!def.weapon.ranged,
      overrides: def.overrides,
    });
    total += share;
    attack += (d.attack + def.weapon.attack) * share;
    armor += d.armor * share;
    hp += d.maxHp * share;
  }
  if (!total) return { hit: 0, armor: 0, hp: 0 };
  return { hit: (attack / total) * 0.75, armor: armor / total, hp: hp / total };
}

/**
 * The gear check (M7.06, DESIGN.md §17.6): each hero's armour and weapon
 * against what this floor usually throws at them. Monsters pick on the
 * thinnest armour in reach, so the front row's armour matters most; the
 * back row is only reached by archers, or once the front falls.
 */
export function gearCheck(
  ix: Index,
  floor: number,
  party: readonly Hero[],
): { hero: string; text: string }[] {
  const threat = floorThreat(ix, floor);
  if (!threat.hit) return [];
  const out: { hero: string; text: string }[] = [];
  const usual = Math.round(threat.hit);
  for (const h of party) {
    const sheet = heroSheet(ix, h);
    const armor = sheet.derived.armor;
    if (h.row === "front" && armor < threat.hit * ARMOUR_STOPS_FAIR) {
      const worn = h.equipment.armor ? ix.item(h.equipment.armor).name.toLowerCase() : undefined;
      const what = worn ? `${h.name}'s ${worn}` : `${h.name}, with no armour,`;
      out.push({
        hero: h.id,
        text: `${what} won't stop much on floor ${floor}: a usual hit there is about ${usual}, and ${worn ? "it" : "they"} stop${worn ? "s" : ""} ${armor}. Monsters tend to go for the thinnest armour they can reach.`,
      });
    }
    const ai = ix.cls(mainClass(h)).ai;
    if (ai === "caster" || ai === "healer") continue;
    const perHit = sheet.derived.attack * 0.75 - threat.armor;
    const blows = perHit > 0 ? threat.hp / perHit : Infinity;
    if (blows > BLOWS_FAIR) {
      const weapon = h.equipment.weapon ? ix.item(h.equipment.weapon).name.toLowerCase() : "fists";
      out.push({
        hero: h.id,
        text: `${h.name}'s ${weapon} will take about ${Number.isFinite(blows) ? Math.round(blows) : "too many"} hits to fell a usual foe on floor ${floor}.`,
      });
    }
  }
  return out;
}

export function scoutingReport(
  ix: Index,
  town: TownState,
  floor: number,
  party: readonly Hero[],
): ScoutingReport {
  const known = knownMonsters(town);
  const monsters: ReportMonster[] = floorOdds(ix, floor)
    .filter((o) => !ix.monster(o.monster).summonOnly)
    .map(({ monster, share }) => {
      const def = ix.monster(monster);
      const resist = new Map<DamageType, number>();
      for (const p of def.passives ?? [])
        if (p.type === "resist")
          resist.set(p.damageType, (resist.get(p.damageType) ?? 0) + p.percent);
      const tier = monsterTier(ix, town, monster, known);
      const ward = def.ward && tier < def.ward.tier ? def.ward.name : undefined;
      return {
        monster,
        share,
        known: tier > 0,
        tier,
        weakTo: tier >= 2 ? [...resist].filter(([, v]) => v < 0).map(([t]) => t) : [],
        shrugsOff: [...resist].filter(([, v]) => v >= 50).map(([t]) => t),
        ambusher: def.tags.includes("ambusher"),
        ...(tier >= 2 && def.research?.tricks ? { tricks: def.research.tricks } : {}),
        ...(ward ? { ward } : {}),
      };
    });

  const warnings: string[] = [];
  if (!party.length) return { floor, monsters, warnings };
  const bestScout = Math.max(...party.map((h) => heroSheet(ix, h).skills.scouting ?? 0));
  const types = new Set<DamageType>();
  for (const h of party) for (const t of damageTypes(ix, h)) types.add(t);

  // A ward (M7.07): however rare (variants included), meeting one unprepared means running.
  const warded = monsters.flatMap((m) => [
    m.monster,
    ...ix.lib.monsters.filter((v) => v.variant?.of === m.monster).map((v) => v.id),
  ]);
  for (const id of new Set(warded)) {
    const def = ix.monster(id);
    const tier = monsterTier(ix, town, id, known);
    if (!def.ward || !tier || tier >= def.ward.tier) continue;
    warnings.push(
      `Nothing the guild has can hurt ${theName(def.name)} (${def.ward.name}) until the Library has studied it. A party that meets one will have to run.`,
    );
  }
  for (const m of monsters) {
    if (!m.known || m.share < 0.1) continue;
    const name = ix.monster(m.monster).name;
    if (m.ambusher && bestScout < SCOUTING_FAIR)
      warnings.push(
        `${name}s lie in wait in ${pct(m.share)} of the groups here, and nobody in this party scouts well (best ${bestScout}). Expect to be ambushed.`,
      );
    const hits = m.weakTo.filter((t) => types.has(t));
    const blocked = [...types].filter((t) => m.shrugsOff.includes(t));
    if (m.weakTo.length && !hits.length && m.share >= 0.25)
      warnings.push(
        `${name}s are in ${pct(m.share)} of the groups here and nobody brings ${m.weakTo.join(" or ")} damage, which hurts them most.`,
      );
    if (blocked.length && blocked.length >= types.size / 2 && m.share >= 0.25)
      warnings.push(
        `${name}s shrug off ${blocked.join(" and ")}, and that's most of what this party deals.`,
      );
  }
  if (monsters.some((m) => !m.known && m.share >= 0.1))
    warnings.push("Something the guild has never met lurks on this floor.");
  warnings.push(...gearCheck(ix, floor, party).map((g) => g.text));
  return { floor, monsters, warnings };
}
