/**
 * The haul in the debrief (M7.03, DESIGN.md §17.4). Coins go straight to the
 * purse and materials to the store, as before, but everything else a party
 * carries home waits in `town.haul` until the player says what to do with
 * each piece:
 *
 * - sell it at the Market, at the haul rate, haggled by whoever's in town;
 * - salvage it at the Blacksmith into materials for building (its level sets
 *   the yield: content/buildings/blacksmith.ts);
 * - keep it in the store room;
 * - send it to the Library to be researched (M7.07): specimens feed research
 *   on their monsters, unidentified finds go on the shelf (research.ts).
 *
 * The guild's haul rule (`town.haulRule`) proposes a choice for every piece,
 * so a busy player can just confirm.
 */
import type { MaterialCost } from "../../content/types";
import type { Index } from "../library";
import type { HaulItem } from "../loot";
import { type HaulChoice, type HaulRule, type HeldItem, type TownState, TownError } from "./state";
import { awaySet, fence, haggler, haulPrice, materialWords, total } from "./read";
import { addMaterials, book, edit, listWords, news, takeFromStash } from "./internal";
import { researchable, sendToLibrary } from "./research";

export const HAUL_RULES: readonly HaulRule[] = ["sell", "salvage", "keep"];

/** The Blacksmith's salvage yield, in percent (0: nothing can be salvaged now). */
export const salvageYield = (ix: Index, town: TownState) => total(ix, town, "salvage");

/** What an item breaks down into at full yield: its own list, or scrap by its tags. */
export function salvageList(ix: Index, itemId: string): MaterialCost | undefined {
  const item = ix.item(itemId);
  if (item.slot === "material") return undefined;
  if (item.salvage) return item.salvage;
  const byTag = ix.lib.town.salvage.byTag;
  const tag = item.tags.find((x) => byTag[x]);
  return tag ? byTag[tag] : undefined;
}

/**
 * What salvaging this item would give the guild today, after the Blacksmith's
 * yield (rounded down, at least 1 of each). Undefined if it can't be salvaged.
 */
export function salvageOf(ix: Index, town: TownState, itemId: string): MaterialCost | undefined {
  const list = salvageList(ix, itemId);
  const pct = salvageYield(ix, town);
  if (!list || pct <= 0) return undefined;
  return Object.fromEntries(
    Object.entries(list).map(([id, n]) => [id, Math.max(1, Math.floor((n * pct) / 100))]),
  );
}

/** The guild's best haggler among those at home (nobody below can talk to the Market). */
export function homeHaggler(ix: Index, town: TownState) {
  const away = awaySet(town);
  return haggler(ix, { ...town, roster: town.roster.filter((h) => !away.has(h.id)) });
}

/** What the Market pays for a piece of haul today. */
export const haulSale = (ix: Index, town: TownState, it: HaulItem) =>
  haulPrice(ix, it.item, it.value, homeHaggler(ix, town).bonus, fence(ix, town));

/** What the haul rule proposes for one piece. */
export function ruleChoice(ix: Index, town: TownState, it: HaulItem, rule: HaulRule): HaulChoice {
  if (rule === "keep") return "keep";
  if (rule === "salvage" && salvageOf(ix, town, it.item)) return "salvage";
  return "sell";
}

/** The haul rule's proposal for everything waiting, by held item id. */
export function haulPlan(
  ix: Index,
  town: TownState,
  rule: HaulRule = town.haulRule ?? "sell",
): Record<string, HaulChoice> {
  return Object.fromEntries((town.haul ?? []).map((it) => [it.id, ruleChoice(ix, town, it, rule)]));
}

export function setHaulRule(_ix: Index, town: TownState, rule: HaulRule): TownState {
  if (!HAUL_RULES.includes(rule)) throw new TownError("No such haul rule.");
  return { ...town, haulRule: rule };
}

/**
 * Deal with pieces of the waiting haul: each id is sold, salvaged or kept.
 * Pieces not named stay where they are.
 */
export function settleHaul(
  ix: Index,
  town: TownState,
  choices: Readonly<Record<string, HaulChoice>>,
): TownState {
  const t = edit(town);
  t.haul ??= [];
  const sale = homeHaggler(ix, t);
  const fenced = fence(ix, t);
  let gold = 0;
  let sold = 0;
  const kept: string[] = [];
  const got: Record<string, number> = {};
  let broken = 0;
  const studied: string[] = [];
  for (const [id, choice] of Object.entries(choices)) {
    const i = t.haul.findIndex((x) => x.id === id);
    if (i < 0) throw new TownError("That isn't in the haul any more.");
    const it = t.haul[i]!;
    if (choice === "sell") {
      gold += haulPrice(ix, it.item, it.value, sale.bonus, fenced);
      sold++;
    } else if (choice === "salvage") {
      const out = salvageOf(ix, t, it.item);
      if (!out)
        throw new TownError(
          salvageYield(ix, t)
            ? `The Blacksmith can't get anything out of the ${ix.item(it.item).name.toLowerCase()}.`
            : "Salvage needs a working Blacksmith.",
        );
      for (const [m, n] of Object.entries(out)) got[m] = (got[m] ?? 0) + n;
      broken++;
    } else if (choice === "keep") {
      t.stash.push(it.item);
      kept.push(ix.item(it.item).name.toLowerCase());
    } else if (choice === "research") {
      studied.push(sendToLibrary(ix, t, it.item));
    } else throw new TownError("Sell, salvage, keep or research?");
    t.haul.splice(i, 1);
  }
  book(t, "haul", gold);
  addMaterials(t, got);
  const said: string[] = [];
  if (sold) said.push(`sold ${pieces(sold)} for ${gold} gold`);
  if (broken) said.push(`broke ${pieces(broken)} down into ${materialWords(ix, got)}`);
  if (kept.length) said.push(`put ${listWords(kept)} in the store room`);
  if (studied.length) said.push(`sent ${listWords(studied)} to the Library`);
  if (said.length) {
    const line = listWords(said);
    news(t, `From the haul, the guild ${line}.`);
  }
  return t;
}

/** "Research what's new": every piece the Library can learn from goes there, the rest as the rule says. */
export function researchPlan(ix: Index, town: TownState): Record<string, HaulChoice> {
  const plan = haulPlan(ix, town);
  for (const it of town.haul ?? []) if (researchable(ix, town, it.item)) plan[it.id] = "research";
  return plan;
}

const pieces = (n: number) => (n === 1 ? "one piece" : `${n} pieces`);

/** Settle everything waiting the way the haul rule says (the bot, tests, "Confirm"). */
export const settleByRule = (ix: Index, town: TownState, rule?: HaulRule) =>
  (town.haul ?? []).length ? settleHaul(ix, town, haulPlan(ix, town, rule)) : town;

/** Break down something from the store room at the Blacksmith. */
export function salvageStash(ix: Index, town: TownState, itemId: string): TownState {
  const out = salvageOf(ix, town, itemId);
  if (!out)
    throw new TownError(
      salvageYield(ix, town)
        ? "Nothing can be got out of that."
        : "Salvage needs a working Blacksmith.",
    );
  const t = edit(town);
  takeFromStash(t, itemId);
  addMaterials(t, out);
  return t;
}

/**
 * A party's haul reaches town: coins into the purse, everything else held
 * for the debrief. (Materials and the heroes' own gear are dealt with by the
 * caller.) Returns the coins paid and what the lot is worth at the Market.
 */
export function bringHome(
  ix: Index,
  t: TownState,
  items: readonly HaulItem[],
  from: string,
  bonus: number,
  fenced: number,
): { coins: number; worth: number; held: number } {
  t.haul ??= [];
  let coins = 0;
  let worth = 0;
  let held = 0;
  for (const h of items) {
    const price = haulPrice(ix, h.item, h.value, bonus, fenced);
    worth += price;
    if (ix.item(h.item).tags.includes("coins")) {
      coins += price;
      continue;
    }
    const piece: HeldItem = { ...h, id: `l${t.nextThingId++}`, from, day: t.day };
    t.haul.push(piece);
    held++;
  }
  book(t, "haul", coins);
  return { coins, worth, held };
}
