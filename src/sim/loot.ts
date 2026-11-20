/**
 * Loot and appraisal (DESIGN.md §5, §11). Loot tables are content; this rolls
 * them, rolls each find's real value, and works out what the party *thinks*
 * it's worth. The better the party's best appraiser, the closer the guess.
 */
import type { ItemDef } from "../content/types";
import type { Index } from "./library";
import type { Rng } from "./rng";

/** Something the party is carrying home. */
export interface HaulItem {
  item: string;
  /** What it will really sell for. */
  value: number;
  /** What the party's best appraiser thinks it's worth. */
  estimate: number;
  /** A hero's own gear, recovered: it goes back in the store room instead of being sold. */
  keep?: boolean;
  /** Whose it was, for recovered gear ("Bram's Sword"). */
  owner?: string;
}

/** How far off a guess can be with Appraisal 0 (±90%). Shrinks to 0 at Appraisal 100. */
const WORST_GUESS = 0.9;

/** Roll a loot table. Returns item ids (rolls that found nothing are left out). */
export function rollLootTable(ix: Index, tableId: string, rng: Rng): string[] {
  const table = ix.lootTable(tableId);
  const total = table.entries.reduce((s, e) => s + e.weight, 0);
  const found: string[] = [];
  const rolls = rng.int(table.rolls[0], table.rolls[1]);
  for (let i = 0; i < rolls; i++) {
    let roll = rng.next() * total;
    const entry = table.entries.find((e) => (roll -= e.weight) < 0) ?? table.entries.at(-1)!;
    if (entry.item) found.push(entry.item);
  }
  return found;
}

/** The real value of one find. */
export function rollValue(def: ItemDef, rng: Rng): number {
  return def.valueRange ? rng.int(def.valueRange[0], def.valueRange[1]) : def.value;
}

/** An appraiser's guess at a value. Always at least 1. */
export function appraise(value: number, appraisal: number, rng: Rng): number {
  const spread = WORST_GUESS * (1 - Math.min(100, Math.max(0, appraisal)) / 100);
  return Math.max(1, Math.round(value * (1 + (rng.next() * 2 - 1) * spread)));
}

export const itemSize = (def: ItemDef): number => def.size ?? 1;

/** Estimated value per carry slot: what the party uses to decide what to keep. */
export const worthPerSlot = (ix: Index, h: HaulItem): number =>
  h.estimate / itemSize(ix.item(h.item));
