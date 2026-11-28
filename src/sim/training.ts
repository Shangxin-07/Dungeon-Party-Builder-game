/**
 * Training points and class gates (M9.10, DESIGN.md §11 "M9.10"): a recruit,
 * porter or miner taking their first class places a few points on their own
 * stats, and must reach that class's gates. Rules only; the town calls these.
 */
import { STATS, type Stat, type StatBlock } from "../content/types";
import type { Index } from "./library";

/** Points placed on each stat in training. */
export type Spend = Partial<Record<Stat, number>>;

/** Classes a recruit can be trained in: the base ones. */
export const baseClasses = (ix: Index) =>
  ix.lib.classes.filter((c) => (c.kind ?? "base") === "base");

/** No stat goes above this in training. */
const STAT_MAX = 20;

const gatesOf = (ix: Index, classId: string) =>
  Object.entries(ix.cls(classId).gates ?? {}) as [Stat, number][];

/** Points short of each gate, before any training. */
const shortfall = (ix: Index, stats: StatBlock, classId: string) =>
  gatesOf(ix, classId).reduce((n, [s, g]) => n + Math.max(0, g - stats[s]), 0);

/**
 * Points it takes to reach a class's gates, or Infinity when one is more than
 * a stat can gain or the whole is more than the points there are.
 */
export function trainingCost(ix: Index, stats: StatBlock, classId: string): number {
  const { points, maxPerStat } = ix.lib.town.training;
  let cost = 0;
  for (const [s, g] of gatesOf(ix, classId)) {
    const need = Math.max(0, g - stats[s]);
    if (need > maxPerStat) return Infinity;
    cost += need;
  }
  return cost <= points ? cost : Infinity;
}

/**
 * The base classes someone with these stats can train in. If they can't reach
 * any gate (about 1 in 100 recruits), the class they're closest to is open to
 * them anyway, so nobody is stuck.
 */
export function openClasses(ix: Index, stats: StatBlock): string[] {
  const all = baseClasses(ix).map((c) => c.id);
  const open = all.filter((id) => trainingCost(ix, stats, id) < Infinity);
  if (open.length) return open;
  const closest = all.reduce((a, b) => (shortfall(ix, stats, b) < shortfall(ix, stats, a) ? b : a));
  return [closest];
}

/** Whether a class is open only because nothing else is: its gates don't apply. */
export const gatesWaived = (ix: Index, stats: StatBlock, classId: string) =>
  trainingCost(ix, stats, classId) === Infinity && openClasses(ix, stats).includes(classId);

/**
 * Where someone would put their points for a class, left to themselves: up to
 * the gates, then the class's main stats, then END, then their best stats.
 */
export function autoSpend(ix: Index, stats: StatBlock, classId: string): Spend {
  const { points, maxPerStat } = ix.lib.town.training;
  const spend: Spend = {};
  let left = points;
  const add = (s: Stat, n: number) => {
    const has = spend[s] ?? 0;
    const k = Math.max(0, Math.min(n, maxPerStat - has, STAT_MAX - stats[s] - has, left));
    if (!k) return;
    spend[s] = has + k;
    left -= k;
  };
  for (const [s, g] of gatesOf(ix, classId)) add(s, g - stats[s]);
  const cls = ix.cls(classId);
  for (const s of cls.mainStats) add(s, maxPerStat);
  add("END", maxPerStat);
  const rest = STATS.filter((s) => !cls.mainStats.includes(s) && s !== "END").sort(
    (a, b) => stats[b] - stats[a],
  );
  for (const s of rest) add(s, maxPerStat);
  return spend;
}

/** Stats after training. */
export function applySpend(stats: StatBlock, spend: Spend): Record<Stat, number> {
  const out = {} as Record<Stat, number>;
  for (const s of STATS) out[s] = stats[s] + (spend[s] ?? 0);
  return out;
}

/** Points placed so far. */
export const spent = (spend: Spend) => STATS.reduce((n, s) => n + (spend[s] ?? 0), 0);

/** What's wrong with a placement for this class, or undefined if it's fine. */
export function checkSpend(
  ix: Index,
  stats: StatBlock,
  classId: string,
  spend: Spend,
): string | undefined {
  const { points, maxPerStat } = ix.lib.town.training;
  for (const [k, n] of Object.entries(spend)) {
    if (!STATS.includes(k as Stat)) return `There's no stat called ${k}.`;
    if (!Number.isInteger(n) || n! < 0) return "Training points are whole and never negative.";
    if (n! > maxPerStat) return `At most ${maxPerStat} points on one stat.`;
    if (stats[k as Stat] + n! > STAT_MAX && n! > 0)
      return `Training can't take ${k} past ${STAT_MAX}.`;
  }
  if (spent(spend) > points) return `Only ${points} training points to place.`;
  if (!openClasses(ix, stats).includes(classId))
    return `They can't reach the ${ix.cls(classId).name}'s gates.`;
  if (gatesWaived(ix, stats, classId)) return undefined;
  const after = applySpend(stats, spend);
  const miss = gatesOf(ix, classId).filter(([s, g]) => after[s] < g);
  if (miss.length)
    return `The ${ix.cls(classId).name} needs ${miss.map(([s, g]) => `${s} ${g}`).join(" and ")}.`;
  return undefined;
}
