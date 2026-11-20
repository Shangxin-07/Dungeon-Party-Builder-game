/**
 * Morale (DESIGN.md §6). Things that happen to a hero are boiled down to
 * numbers ("facts": gold share, kills, new floors, a quiet day in town...).
 * Morale rules in content turn facts into morale: the rules everyone follows
 * (content/morale.ts) plus the hero's motivation (content/motivations/).
 *
 * Losses are softened by the hero's WIL (morale stability) and, on a trip,
 * by the party's best CHA (a leader keeps spirits up).
 */
import type { MoraleFact, MoraleRule } from "../content/types";
import { heroSheet, type Hero, type MoraleNote } from "./hero";
import type { Index } from "./library";

export type Facts = Partial<Record<MoraleFact, number>>;

/** How many morale notes each hero keeps. */
const LOG_LENGTH = 10;

/** Share of each morale loss a hero actually feels (WIL and a leader's CHA help). */
export function lossFactor(ix: Index, hero: Hero, leaderCha = 10): number {
  const m = ix.lib.morale;
  const wil = heroSheet(ix, hero).stats.WIL;
  const f = 1 - (wil - 10) * m.stabilityPerWil - Math.max(0, leaderCha - 10) * m.leaderPerCha;
  return Math.max(0.5, Math.min(1.5, f));
}

/** The rules that apply to a hero: everyone's, then their motivation's. */
export function moraleRules(ix: Index, hero: Hero): readonly MoraleRule[] {
  return [...ix.lib.morale.rules, ...ix.motivation(hero.motivation).rules];
}

/** What these facts would do to a hero's morale, rule by rule. Doesn't change the hero. */
export function moraleChanges(
  ix: Index,
  hero: Hero,
  facts: Facts,
  opts: { leaderCha?: number } = {},
): { amount: number; reason: string }[] {
  const out: { amount: number; reason: string }[] = [];
  const loss = lossFactor(ix, hero, opts.leaderCha);
  const m = ix.lib.morale;
  const favourite = ix.building(hero.favourite).name;
  for (const r of moraleRules(ix, hero)) {
    const v = facts[r.fact] ?? 0;
    if (!v) continue;
    if (r.below !== undefined && hero.morale >= r.below) continue;
    if (r.above !== undefined && hero.morale <= r.above) continue;
    let amount = (r.amount * v) / (r.per ?? 1);
    if (r.cap !== undefined) amount = Math.max(-r.cap, Math.min(r.cap, amount));
    if (amount < 0) amount = Math.round(amount * loss);
    else if (hero.morale > m.contentAbove.morale)
      amount = Math.floor(amount * m.contentAbove.gainShare);
    else amount = Math.round(amount);
    if (amount)
      out.push({
        amount,
        reason: r.reason.replaceAll("{favourite}", favourite),
      });
  }
  return out;
}

/**
 * Apply facts to a hero's morale (changes the hero). Returns the total change.
 * Notes go in the hero's morale log; a repeat of the last reason is merged
 * into it, so a week of quiet days is one line.
 */
export function applyMorale(
  ix: Index,
  hero: Hero,
  facts: Facts,
  day: number,
  opts: { leaderCha?: number } = {},
): number {
  const before = hero.morale;
  for (const c of moraleChanges(ix, hero, facts, opts)) {
    hero.morale = Math.max(0, Math.min(100, hero.morale + c.amount));
    note(hero, { day, amount: c.amount, reason: c.reason });
  }
  return hero.morale - before;
}

/** A recent note with the same reason absorbs a repeat, so a week of quiet days is one line. */
const MERGE_DAYS = 7;
const MERGE_BACK = 4;

function note(hero: Hero, n: MoraleNote): void {
  const same = hero.moraleLog
    .slice(-MERGE_BACK)
    .find(
      (x) =>
        x.reason === n.reason &&
        Math.sign(x.amount) === Math.sign(n.amount) &&
        n.day - (x.since ?? x.day) <= MERGE_DAYS,
    );
  if (same) {
    same.since ??= same.day;
    same.amount += n.amount;
    same.day = n.day;
    // Keep the log in order: the merged note moves to the end.
    hero.moraleLog = [...hero.moraleLog.filter((x) => x !== same), same];
  } else {
    hero.moraleLog.push(n);
  }
  if (hero.moraleLog.length > LOG_LENGTH)
    hero.moraleLog.splice(0, hero.moraleLog.length - LOG_LENGTH);
}

/** Below this a hero complains and may ignore orders. */
export const isLow = (ix: Index, hero: Hero) => hero.morale < ix.lib.morale.low;

/** A word for how a hero feels. */
export function mood(ix: Index, hero: Hero): string {
  const m = hero.morale;
  if (m <= 0) return "fed up";
  if (m < ix.lib.morale.low) return "unhappy";
  if (m < 50) return "restless";
  if (m < 75) return "content";
  return "eager";
}

/** Gear tags a hero is using: equipped items, plus their class's spells (a school of magic). */
export function gearTags(ix: Index, hero: Hero): Set<string> {
  const tags = new Set<string>();
  for (const id of Object.values(hero.equipment))
    if (id) for (const t of ix.item(id).tags) tags.add(t);
  for (const a of ix.cls(hero.classId).abilities) for (const t of ix.ability(a).tags) tags.add(t);
  return tags;
}
