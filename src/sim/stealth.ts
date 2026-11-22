/**
 * Sneaking (M7.08, DESIGN.md §17.8): how quiet a party is, how well monsters
 * hear, and which lairs the guild knows of. Pure reading, shared by the trip
 * and the town screen. Rules in content/stealth.ts.
 */
import type { LairDef } from "../content/types";
import { heroSheet, type Hero } from "./hero";
import type { Index } from "./library";
import type { TownState } from "./town";

/**
 * A party's Stealth: its worst hero's (one clanking fighter gives everyone
 * away), less a little for every hero over a quiet pair. `hero` is the loudest.
 */
export function partyStealth(
  ix: Index,
  party: readonly Hero[],
): { value: number; hero?: Hero; crowd: number } {
  const rules = ix.lib.stealth;
  let worst: { value: number; hero?: Hero } = { value: 0 };
  for (const h of party) {
    const v = heroSheet(ix, h).skills.stealth ?? 0;
    if (!worst.hero || v < worst.value) worst = { value: v, hero: h };
  }
  const crowd = Math.max(0, party.length - rules.quietParty) * rules.perExtraHero;
  return { value: Math.max(0, worst.value - crowd), hero: worst.hero, crowd };
}

/** How well a monster hears: PER × earPerPer + its own `hearing`. */
export function hearingOf(ix: Index, monster: string): number {
  const def = ix.monster(monster);
  return def.stats.PER * ix.lib.stealth.earPerPer + (def.hearing ?? 0);
}

/** Chance a party this quiet gets past this group unheard: it goes by the sharpest ear. */
export function sneakChance(ix: Index, stealth: number, monsters: readonly string[]): number {
  const r = ix.lib.stealth;
  const ear = Math.max(...monsters.map((id) => hearingOf(ix, id)));
  return Math.max(r.min, Math.min(r.max, r.base + (stealth - ear) / 100));
}

/** Lairs on a floor (content/lairs/). */
export const lairsOn = (ix: Index, floor: number): LairDef[] =>
  (ix.lib.lairs ?? []).filter((l) => l.floor === floor);

/** Lairs the guild knows of: scouts found them (M7.08). */
export function knownLairs(ix: Index, town: TownState): LairDef[] {
  const ids = new Set(Object.values(town.intel ?? {}).flatMap((i) => i.lairs ?? []));
  return (ix.lib.lairs ?? []).filter((l) => ids.has(l.id));
}

/** The beast in this lair is dead. */
export const lairSlain = (town: TownState, id: string): boolean => !!town.lairs?.[id]?.slain;
