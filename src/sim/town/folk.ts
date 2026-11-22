/**
 * Townsfolk (M7.15, DESIGN.md §18.1b and §18.2b). Settlers come to a town
 * that is safe (no raid has got through for `safeDays`), has housing to
 * spare (Cottages) and grows enough food for one more (the Farm). They:
 *
 * - eat: `eats` food a day each, from what the Farm grows and the store; a
 *   town that runs out loses a settler a day until it can feed them;
 * - pay: `tax` gold a day each, and more on market days with a Market;
 * - work: the player puts them on posts that take settlers (salvage,
 *   lookout; never the barricade, and they add no defence) or at workshop
 *   benches, sharing the slots with heroes, who come first;
 * - scare: a raid that gets through sends a share of them packing.
 *
 * Settlers are a number, not people with names: one line next to the gold,
 * never a management screen. Rules: content/townsfolk.ts.
 */
import type { Index } from "../library";
import type { RaidReport } from "../raid";
import { type Folk, type TownState, TownError } from "./state";
import { openPosts, total } from "./read";
import { book, edit, news, roll } from "./internal";
import { benches } from "./workshops";

export const folkOf = (town: TownState): Folk => town.folk ?? { count: 0, food: 0, jobs: {} };

/** Room for settlers (Cottages). */
export const housing = (ix: Index, town: TownState) => total(ix, town, "housing");

/** Food grown a day (the Farm). */
export const foodGrown = (ix: Index, town: TownState) => total(ix, town, "food");

/** Settlers with a job, and with none. */
export const folkWorking = (town: TownState) =>
  Object.values(folkOf(town).jobs).reduce((s, n) => s + n, 0);
export const folkIdle = (town: TownState) => folkOf(town).count - folkWorking(town);

/** Settlers on a job ("post:<id>" or "workshop:<building id>"). */
export const folkAt = (town: TownState, job: string) => folkOf(town).jobs[job] ?? 0;

/** Room left for settlers on a job today, after the heroes. 0 if they can't work it. */
export function folkRoom(ix: Index, town: TownState, job: string): number {
  const [kind, id] = job.split(":") as [string, string];
  if (kind === "post") {
    const post = openPosts(ix, town).find((p) => p.id === id);
    if (!post?.settlers) return 0;
    return Math.max(0, post.slots - (town.posts?.[id]?.length ?? 0));
  }
  if (kind === "workshop") {
    const seats = benches(ix, town, id);
    return Math.max(0, seats - (town.workshops?.[id]?.workers.length ?? 0));
  }
  return 0;
}

/** Every job settlers could take today, for the panel. */
export function folkJobs(ix: Index, town: TownState): string[] {
  const posts = openPosts(ix, town)
    .filter((p) => p.settlers)
    .map((p) => `post:${p.id}`);
  const shops = ix.lib.buildings
    .filter((b) => benches(ix, town, b.id) > 0)
    .map((b) => `workshop:${b.id}`);
  return [...posts, ...shops];
}

/** A job's name for people: "Salvage crew", "Sawmill". */
export function jobName(ix: Index, job: string): string {
  const [kind, id] = job.split(":") as [string, string];
  return kind === "post" ? ix.post(id).name : ix.building(id).name;
}

/** Put `n` settlers on a job (0 takes them all off). */
export function setFolkJob(ix: Index, town: TownState, job: string, n: number): TownState {
  if (!Number.isInteger(n) || n < 0) throw new TownError("That isn't a number of people.");
  const t = edit(town);
  const folk = folkOf(t);
  const now = folk.jobs[job] ?? 0;
  if (n > now) {
    if (!folkJobs(ix, t).includes(job)) throw new TownError("Townsfolk can't do that.");
    if (n - now > folk.count - folkWorking(t)) throw new TownError("Nobody free to send.");
    if (n > folkRoom(ix, t, job)) throw new TownError(`No more room at the ${jobName(ix, job)}.`);
  }
  if (n) folk.jobs[job] = n;
  else delete folk.jobs[job];
  t.folk = folk;
  return t;
}

/** Fewer settlers than jobs: take the last ones off their jobs. */
function trimJobs(folk: Folk): void {
  let over = Object.values(folk.jobs).reduce((s, n) => s + n, 0) - folk.count;
  for (const job of Object.keys(folk.jobs).reverse()) {
    if (over <= 0) break;
    const off = Math.min(over, folk.jobs[job]!);
    folk.jobs[job]! -= off;
    over -= off;
    if (!folk.jobs[job]) delete folk.jobs[job];
  }
}

/** The day the last raid got through, if any. */
const lastBreach = (t: TownState) =>
  [...t.raids].reverse().find((r) => r.outcome === "overrun" || r.outcome === "unopposed")?.day;

/** Why no settlers are coming, or undefined if they may. */
export function whyNoSettlers(ix: Index, town: TownState): string | undefined {
  if (town.camp) return "Nobody settles at a mining camp.";
  const folk = folkOf(town);
  const rules = ix.lib.townsfolk;
  if (folk.count >= housing(ix, town))
    return housing(ix, town)
      ? "The Cottages are full."
      : "There's nowhere to live: build Cottages.";
  if (foodGrown(ix, town) < (folk.count + 1) * rules.eats)
    return "The town doesn't grow enough food for more: build up the Farm.";
  const breach = lastBreach(town);
  if (breach !== undefined && town.day - breach < rules.safeDays)
    return `A raid got through on day ${breach}: they'll wait until it's been quiet for ${rules.safeDays} days.`;
  return undefined;
}

/**
 * The townsfolk's day (end of each day): they eat, pay their taxes, leave if
 * hungry, and new ones may arrive.
 */
export function folkDay(ix: Index, t: TownState): void {
  if (t.camp) return;
  const rules = ix.lib.townsfolk;
  const folk = folkOf(t);
  const grown = foodGrown(ix, t);
  if (!folk.count && !grown && !housing(ix, t)) return;
  t.folk = folk;
  // Food: grown, eaten, the rest stored.
  const food = folk.food + grown - folk.count * rules.eats;
  if (food < 0 && folk.count) {
    folk.count -= 1;
    folk.food = 0;
    trimJobs(folk);
    news(t, "There isn't enough food: a family of settlers packed up and left.", "bad");
  } else folk.food = Math.min(rules.foodStore, Math.max(0, food));
  // Taxes, and market days.
  let gold = folk.count * rules.tax;
  const market = (t.buildings.market ?? 0) > 0 && !t.damaged.includes("market");
  if (market && rules.marketEvery && t.day % rules.marketEvery === 0)
    gold += folk.count * rules.marketDay;
  book(t, "taxes", gold);
  // Newcomers.
  if (whyNoSettlers(ix, t)) return;
  const come = roll(t, (rng) =>
    rng.next() < rules.arrivalChance ? rng.int(1, rules.arrivalMax) : 0,
  );
  const room = Math.min(housing(ix, t) - folk.count, Math.floor(grown / rules.eats) - folk.count);
  const n = Math.max(0, Math.min(come, room));
  if (!n) return;
  folk.count += n;
  news(
    t,
    n === 1 ? "A settler moved into the Cottages." : `${n} settlers moved into the Cottages.`,
    "good",
  );
}

/** A raid got through: some of the townsfolk have had enough. */
export function folkScared(ix: Index, t: TownState, raid: RaidReport): void {
  if (raid.outcome !== "overrun" && raid.outcome !== "unopposed") return;
  const folk = t.folk;
  if (!folk?.count) return;
  const gone = Math.min(folk.count, Math.ceil(folk.count * ix.lib.townsfolk.fleeOnRaid));
  folk.count -= gone;
  trimJobs(folk);
  news(
    t,
    `After the raid, ${gone === 1 ? "a settler" : `${gone} settlers`} packed up and left.`,
    "bad",
  );
}
