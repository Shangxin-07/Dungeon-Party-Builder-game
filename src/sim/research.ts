/**
 * What the guild knows about each monster (M7.07, DESIGN.md §17.7): who has
 * met what, and how far the Library's research on it has got. Pure reading;
 * the Library's day and the player's choices are in town/research.ts.
 */
import type { MonsterDef } from "../content/types";
import type { Index } from "./library";
import type { TownState } from "./town";

/** Names for the research tiers, by number. */
export const TIER_NAMES = ["Unknown", "Met", "Studied", "Mastered"] as const;

/** "the Cave Troll", but "The Foreman's Shade" as it is. */
export const theName = (name: string) => (/^the /i.test(name) ? name : `the ${name}`);

/** Every monster anyone in the guild (living, departed or dead) has met. */
export function knownMonsters(town: TownState): Set<string> {
  const out = new Set<string>();
  for (const r of Object.values(town.records)) for (const m of r.seen) out.add(m);
  for (const m of town.memorial) for (const s of m.record.seen) out.add(s);
  return out;
}

/** Points to reach Studied and Mastered (totals) for a monster. */
export function monsterNeeds(ix: Index, def: MonsterDef): readonly [number, number] {
  const own = def.research?.points;
  if (own) return own;
  const [a, b] = ix.lib.research.perPower;
  return [Math.round(def.power * a), Math.round(def.power * b)];
}

/** How far the guild's research on a monster has got: 0 unknown, 1 met, 2 Studied, 3 Mastered. */
export function monsterTier(ix: Index, town: TownState, id: string, known?: Set<string>): number {
  const points = town.research.monsters[id] ?? 0;
  if (!(known ?? knownMonsters(town)).has(id) && !points) return 0;
  const [studied, mastered] = monsterNeeds(ix, ix.monster(id));
  return points >= mastered ? 3 : points >= studied ? 2 : 1;
}

/** Every monster the guild has Studied or Mastered, by id: what fights need to know. */
export function researchTiers(ix: Index, town: TownState): Record<string, number> {
  const out: Record<string, number> = {};
  const known = knownMonsters(town);
  for (const id of Object.keys(town.research.monsters ?? {})) {
    const tier = monsterTier(ix, town, id, known);
    if (tier >= 2) out[id] = tier;
  }
  return out;
}
