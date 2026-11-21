/**
 * Kitting heroes out: equipping, packing and formation rows.
 */
import type { Row } from "../../content/types";
import { EQUIP_SLOTS, heroSheet, type EquipSlot, type Hero } from "../hero";
import type { Index } from "../library";
import { type TownState, TownError } from "./state";
import { shopStock, buyPrice } from "./read";
import { book, edit, hero, takeFromStash } from "./internal";

/**
 * Give a hero their class's usual kit (content/classes/*.ts startingKit):
 * from the store room first, then, if `buy`, from the Market while the gold
 * lasts. Slots they already have filled are left alone.
 */
export function kitOut(ix: Index, town: TownState, heroId: string, buy = true): TownState {
  let t = edit(town);
  const h = hero(t, heroId);
  const stock = shopStock(ix, t);
  const pack = [...h.pack];
  for (const id of ix.cls(h.classId).startingKit) {
    const item = ix.item(id);
    const slot = item.slot as EquipSlot;
    const wearable = (EQUIP_SLOTS as readonly string[]).includes(item.slot);
    if (wearable ? h.equipment[slot] : pack.includes(id)) {
      if (!wearable) pack.splice(pack.indexOf(id), 1);
      continue;
    }
    if (!t.stash.includes(id)) {
      if (!buy || !stock.includes(id) || t.gold < buyPrice(item)) continue;
      book(t, "bought", -buyPrice(item));
      t.stash.push(id);
    }
    t = wearable ? equip(ix, t, heroId, id) : packItem(ix, t, heroId, id);
  }
  // At the mining camp (DESIGN.md §8) there's no proper kit: whoever is left
  // with empty hands takes something makeshift from the store room, a ranged
  // one for the back row.
  for (const slot of EQUIP_SLOTS) {
    const h2 = hero(t, heroId);
    if (h2.equipment[slot]) continue;
    const spare = t.stash
      .map((id) => ix.item(id))
      .filter((i) => i.slot === slot && i.tags.includes("makeshift"))
      .sort(
        (a, b) =>
          Number(!!b.ranged === (h2.row === "back")) - Number(!!a.ranged === (h2.row === "back")),
      )[0];
    if (spare) t = equip(ix, t, heroId, spare.id);
  }
  return t;
}

/** Put an item from the store room on a hero. Whatever they had goes back. */
export function equip(ix: Index, town: TownState, heroId: string, itemId: string): TownState {
  const slot = ix.item(itemId).slot;
  if (!(EQUIP_SLOTS as readonly string[]).includes(slot))
    throw new TownError("That can't be worn or wielded.");
  const t = edit(town);
  const h = hero(t, heroId);
  takeFromStash(t, itemId);
  const old = h.equipment[slot as EquipSlot];
  if (old) t.stash.push(old);
  h.equipment[slot as EquipSlot] = itemId;
  return keepHpInBounds(ix, t, h);
}

export function unequip(ix: Index, town: TownState, heroId: string, slot: EquipSlot): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const old = h.equipment[slot];
  if (!old) return town;
  t.stash.push(old);
  delete h.equipment[slot];
  return keepHpInBounds(ix, t, h);
}

/** Gear can change max HP and mana; don't leave a hero above their new max. */
export function keepHpInBounds(ix: Index, t: TownState, h: Hero): TownState {
  const d = heroSheet(ix, h).derived;
  h.hp = Math.min(h.hp, d.maxHp);
  h.mana = Math.min(h.mana, d.mana);
  return t;
}

/** Hand a consumable from the store room to a hero to carry. */
export function packItem(ix: Index, town: TownState, heroId: string, itemId: string): TownState {
  if (ix.item(itemId).slot !== "consumable") throw new TownError("Only supplies go in packs.");
  const t = edit(town);
  const h = hero(t, heroId);
  if (h.pack.length >= heroSheet(ix, h).derived.carrySlots)
    throw new TownError(`${h.name}'s pack is full.`);
  takeFromStash(t, itemId);
  h.pack.push(itemId);
  return t;
}

export function unpackItem(_ix: Index, town: TownState, heroId: string, index: number): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const [item] = h.pack.splice(index, 1);
  if (item) t.stash.push(item);
  return t;
}

export function setRow(_ix: Index, town: TownState, heroId: string, row: Row): TownState {
  const t = edit(town);
  hero(t, heroId).row = row;
  return t;
}
