/**
 * The scouting report (M6): what the guild knows about a floor before the
 * party goes down, and where this party looks weak against it. Floors favour
 * different monsters (EncounterDef.weightOn), so the right party changes with
 * the floor. Everything here is worked out from content; nothing is rolled.
 */
import type { DamageType } from "../content/types";
import { floorOdds } from "./encounter";
import { heroSheet, type Hero } from "./hero";
import type { Index } from "./library";
import type { TownState } from "./town";

/** Below this best Scouting, ambushers will usually strike first. */
export const SCOUTING_FAIR = 55;

export interface ReportMonster {
  monster: string;
  /** Share of the monster groups on this floor that include one, 0-1. */
  share: number;
  /** Has anyone in the guild met one? Unknown monsters are shown as "???". */
  known: boolean;
  /** Damage types it takes extra from, and ones it shrugs off (≥ 50%). */
  weakTo: DamageType[];
  shrugsOff: DamageType[];
  ambusher: boolean;
}

export interface ScoutingReport {
  floor: number;
  monsters: ReportMonster[];
  /** Plain-words worries about this party on this floor. */
  warnings: string[];
}

/** Every monster anyone in the guild (living, departed or dead) has met. */
export function knownMonsters(town: TownState): Set<string> {
  const out = new Set<string>();
  for (const r of Object.values(town.records)) for (const m of r.seen) out.add(m);
  for (const m of town.memorial) for (const s of m.record.seen) out.add(s);
  return out;
}

/** The damage types a hero can deal: their weapon, and their spells. */
export function damageTypes(ix: Index, hero: Hero): Set<DamageType> {
  const out = new Set<DamageType>();
  const w = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  out.add(w?.damageType ?? "crushing");
  for (const a of ix.cls(hero.classId).abilities)
    for (const e of ix.ability(a).effects) if (e.type === "dealDamage") out.add(e.damageType);
  return out;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

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
      return {
        monster,
        share,
        known: known.has(monster),
        weakTo: [...resist].filter(([, v]) => v < 0).map(([t]) => t),
        shrugsOff: [...resist].filter(([, v]) => v >= 50).map(([t]) => t),
        ambusher: def.tags.includes("ambusher"),
      };
    });

  const warnings: string[] = [];
  if (!party.length) return { floor, monsters, warnings };
  const bestScout = Math.max(...party.map((h) => heroSheet(ix, h).skills.scouting ?? 0));
  const types = new Set<DamageType>();
  for (const h of party) for (const t of damageTypes(ix, h)) types.add(t);

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
  return { floor, monsters, warnings };
}
