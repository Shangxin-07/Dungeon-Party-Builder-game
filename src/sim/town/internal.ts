/**
 * Small helpers the town actions share: copy-on-write, news, the ledger, dice.
 * Not part of the town's public API (index.ts doesn't re-export them).
 */
import { EQUIP_SLOTS, type Hero } from "../hero";
import type { Index } from "../library";
import type { HaulItem } from "../loot";
import { createRng, type Rng } from "../rng";
import { type TownState, type LedgerKind, LEDGER_DAYS, type News, TownError } from "./state";
import { findHero } from "./read";

/** How many lines of news the town keeps. */
export const NEWS_LENGTH = 12;

export function news(t: TownState, text: string, tone?: News["tone"]): void {
  t.news = [...t.news, { day: t.day, text, tone }].slice(-NEWS_LENGTH);
}

/** Move gold in or out and write it in the accounts. */
export function book(t: TownState, kind: LedgerKind, amount: number): void {
  if (!amount) return;
  t.gold += amount;
  const line = t.ledger.find((l) => l.day === t.day && l.kind === kind);
  if (line) line.amount += amount;
  else t.ledger.push({ day: t.day, kind, amount });
  t.ledger = t.ledger.filter((l) => l.day > t.day - LEDGER_DAYS);
}

/** Use up materials from the store (check materialsShort first). */
export function useMaterials(
  t: TownState,
  cost: Readonly<Record<string, number>> | undefined,
): void {
  for (const [id, n] of Object.entries(cost ?? {})) {
    const left = (t.materials[id] ?? 0) - n;
    if (left < 0) throw new TownError("Not enough materials.");
    if (left) t.materials[id] = left;
    else delete t.materials[id];
  }
}

/** Put materials in the store. */
export function addMaterials(t: TownState, found: Readonly<Record<string, number>>): void {
  for (const [id, n] of Object.entries(found)) if (n) t.materials[id] = (t.materials[id] ?? 0) + n;
}

/** Take the next random roll from the town's seed. */
export function roll<T>(town: TownState, use: (rng: Rng) => T): T {
  const rng = createRng(town.seed);
  const out = use(rng);
  town.seed = rng.int(0, 2 ** 31 - 1);
  return out;
}

/** Deep enough copy that actions can change the copy freely. */
export function edit(town: TownState): TownState {
  return structuredClone(town);
}

export function hero(town: TownState, id: string): Hero {
  const h = findHero(town, id);
  if (!h) throw new TownError("No such hero in the guild.");
  return h;
}

export function takeFromStash(town: TownState, itemId: string): void {
  const i = town.stash.indexOf(itemId);
  if (i < 0) throw new TownError("That isn't in the store room.");
  town.stash.splice(i, 1);
}

export const listWords = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

/** A hero's gear as items lying where they fell: it goes back to the store room, not the Market. */
export function gearOf(ix: Index, h: Hero): HaulItem[] {
  const ids = [
    ...EQUIP_SLOTS.map((s) => h.equipment[s]).filter((id): id is string => !!id),
    ...h.pack,
  ];
  return ids.map((id) => {
    const v = ix.item(id).value;
    return { item: id, value: v, estimate: v, keep: true, owner: h.name };
  });
}
