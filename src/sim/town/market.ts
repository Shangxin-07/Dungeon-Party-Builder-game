/**
 * Buying, selling and restocking at the Market.
 */
import { heroSheet } from "../hero";
import type { Index } from "../library";
import { type TownState, TownError } from "./state";
import { shopStock, buyPrice, haggler, sellPrice, findHero } from "./read";
import { book, edit, hero, takeFromStash } from "./internal";

export function buy(ix: Index, town: TownState, itemId: string): TownState {
  if (!shopStock(ix, town).includes(itemId)) throw new TownError("The Market doesn't sell that.");
  const price = buyPrice(ix.item(itemId));
  if (town.gold < price) throw new TownError("Not enough gold.");
  const t = edit(town);
  book(t, "bought", -price);
  t.stash.push(itemId);
  return t;
}

export function sell(ix: Index, town: TownState, itemId: string): TownState {
  const t = edit(town);
  takeFromStash(t, itemId);
  book(t, "sold", sellPrice(ix, ix.item(itemId), haggler(ix, t).bonus));
  return t;
}

/** One potion or bandage to put back in a hero's pack after a trip. */
export interface RestockLine {
  heroId: string;
  item: string;
  /** From the store room (free) or bought at the Market. */
  from: "store" | "market";
  cost: number;
}

/**
 * What the last trip used up (M6): every consumable a hero set off with and
 * came back without, to be taken from the store room or bought again. The
 * player sees this list and okays it. Things nobody sells are left out.
 */
export function restockPlan(ix: Index, town: TownState): RestockLine[] {
  const trip = town.lastTrip;
  if (!trip) return [];
  const stash = [...town.stash];
  const stock = shopStock(ix, town);
  const out: RestockLine[] = [];
  for (const before of trip.party) {
    const h = findHero(town, before.id);
    if (!h) continue;
    const now = [...h.pack];
    let room = heroSheet(ix, h).derived.carrySlots - h.pack.length;
    for (const id of before.pack) {
      const i = now.indexOf(id);
      if (i >= 0) {
        now.splice(i, 1);
        continue;
      }
      if (room <= 0) break;
      const s = stash.indexOf(id);
      if (s >= 0) {
        stash.splice(s, 1);
        out.push({ heroId: h.id, item: id, from: "store", cost: 0 });
      } else if (stock.includes(id)) {
        out.push({ heroId: h.id, item: id, from: "market", cost: buyPrice(ix.item(id)) });
      } else continue;
      room--;
    }
  }
  return out;
}

/** Put used supplies back in packs, buying what the store room doesn't have. */
export function restock(ix: Index, town: TownState, lines: readonly RestockLine[]): TownState {
  const cost = lines.reduce((s, l) => s + l.cost, 0);
  if (cost > town.gold) throw new TownError("Not enough gold for all of that.");
  const t = edit(town);
  for (const l of lines) {
    const h = hero(t, l.heroId);
    if (h.pack.length >= heroSheet(ix, h).derived.carrySlots)
      throw new TownError(`${h.name}'s pack is full.`);
    if (l.from === "store") takeFromStash(t, l.item);
    else book(t, "bought", -buyPrice(ix.item(l.item)));
    h.pack.push(l.item);
  }
  return t;
}
