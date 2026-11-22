/**
 * Paying the guild (M7.12, DESIGN.md §18.2): adventurers are paid like
 * adventurers. A hero at home draws a small retainer every day; a party that
 * comes home takes a share of what its haul is worth. A failed trip costs no
 * pay at all, a rich one pays well, and a guild that never delves still pays
 * retainers and slowly goes broke. The numbers are content (content/town.ts
 * `retainer`, `shares`, `raises`).
 */
import type { Hero } from "../hero";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import type { TownState } from "./state";
import { awaySet, retainer, shareUnits } from "./read";
import { book, listWords, news } from "./internal";

/**
 * Split a party's take between `who` by their shares (content/town.ts
 * `shares.percent` of `worth`, the haul's Market value). Whole gold only;
 * the odd coins go to whoever holds the most shares. Nothing is paid here.
 */
export function splitShares(
  ix: Index,
  who: readonly Hero[],
  worth: number,
): Record<string, number> {
  const pot = Math.max(0, Math.round((worth * ix.lib.town.shares.percent) / 100));
  const units = who.map((h) => shareUnits(ix, h));
  const all = units.reduce((s, u) => s + u, 0);
  const out: Record<string, number> = {};
  if (all <= 0) return out;
  let given = 0;
  who.forEach((h, i) => {
    const n = Math.floor((pot * units[i]!) / all);
    out[h.id] = n;
    given += n;
  });
  const top = who.reduce((best, h, i) => (units[i]! > shareUnits(ix, best) ? h : best), who[0]!);
  out[top.id] = (out[top.id] ?? 0) + pot - given;
  return out;
}

/**
 * A party comes home: each of `who` takes their share of the haul (worth its
 * Market value), out of the purse. What the purse can't cover is owed, and
 * paid before anything else each day. Returns each hero's share by id.
 */
export function payShares(
  ix: Index,
  t: TownState,
  who: readonly Hero[],
  worth: number,
): Record<string, number> {
  const shares = splitShares(ix, who, worth);
  for (const h of who) {
    const due = shares[h.id] ?? 0;
    if (!due) continue;
    const paid = Math.min(due, Math.max(0, t.gold));
    book(t, "shares", -paid);
    if (paid < due) h.owed = (h.owed ?? 0) + due - paid;
  }
  return shares;
}

/**
 * The end of a day's pay: shares still owed first, then the retainer for
 * everyone at home, in roster order, while the gold lasts. Anyone at home
 * who goes short takes it badly ("unpaid"). Heroes away below draw no
 * retainer: they're paid by their share when they're back.
 */
export function payDay(ix: Index, t: TownState): void {
  // At the mining camp (DESIGN.md §8) everyone works for their keep: pay
  // starts when the camp is held and the guild proper opens its books.
  if (t.camp) return;
  const away = awaySet(t);
  const short = new Set<Hero>();
  for (const h of t.roster) {
    if (!h.owed) continue;
    const paid = Math.min(h.owed, Math.max(0, t.gold));
    book(t, "shares", -paid);
    h.owed -= paid;
    if (!h.owed) h.owed = undefined;
    else if (!away.has(h.id)) short.add(h);
  }
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    const r = retainer(ix, h);
    if (t.gold >= r) book(t, "wages", -r);
    else short.add(h);
  }
  if (!short.size) return;
  for (const h of short) applyMorale(ix, h, { unpaid: 1 }, t.day);
  news(t, `The guild couldn't pay ${listWords([...short].map((h) => h.name))} today.`, "bad");
}
