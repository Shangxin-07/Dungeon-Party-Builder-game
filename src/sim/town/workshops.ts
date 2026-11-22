/**
 * Workshops (M7.14, DESIGN.md §18.1): buildings that make things over days.
 * The Blacksmith forges, the Apothecary brews, the Sawmill saws. Each has
 * benches (its `workshop` effect) for heroes or porters at home, and a queue
 * of jobs from its recipes (content/recipes/). Materials and gold are paid
 * when a job is queued and given back if it's called off.
 *
 * Every day, each worker at home and on their feet puts in work on the job at
 * the front of the queue: more with the recipe's stat, less for a porter.
 * A finished job's goods go to the store (materials) or the store room. A day
 * at the bench is only half a day's rest (content/workshops.ts), so putting a
 * hero who just came home on the forge is a real choice.
 */
import type { RecipeDef } from "../../content/types";
import { heroSheet, type Hero } from "../hero";
import type { Index } from "../library";
import { type Job, type TownState, type Workshop, TownError } from "./state";
import { findHero, materialsShort, materialWords, standing } from "./read";
import { addMaterials, book, edit, listWords, news, useMaterials } from "./internal";

/** Benches a building has today (0 if it isn't a workshop, isn't built, or is damaged). */
export function benches(ix: Index, town: TownState, shopId: string): number {
  if (!standing(town, shopId)) return 0;
  const level = town.buildings[shopId] ?? 0;
  const lvl = ix.building(shopId).levels[level - 1];
  return (lvl?.effects ?? []).reduce((n, e) => (e.type === "workshop" ? n + e.benches : n), 0);
}

/** Every building that is a workshop at some level, built or not. */
export const workshopIds = (ix: Index) =>
  ix.lib.buildings
    .filter((b) => b.levels.some((l) => l.effects.some((e) => e.type === "workshop")))
    .map((b) => b.id);

/** The workshops working today. */
export const openWorkshops = (ix: Index, town: TownState) =>
  workshopIds(ix).filter((id) => benches(ix, town, id) > 0);

const shopOf = (town: TownState, id: string): Workshop =>
  town.workshops?.[id] ?? { workers: [], queue: [] };

/** All of a workshop's recipes, and whether its level allows each today. */
export function recipesAt(
  ix: Index,
  town: TownState,
  shopId: string,
): { recipe: RecipeDef; ready: boolean }[] {
  const level = town.buildings[shopId] ?? 0;
  return (ix.lib.recipes ?? [])
    .filter((r) => r.workshop === shopId)
    .map((recipe) => ({ recipe, ready: level >= (recipe.level ?? 1) }));
}

/** "2 planks", "an iron sword", "chainmail". */
export function recipeWords(ix: Index, r: RecipeDef): string {
  if (r.name) return r.name;
  const n = r.count ?? 1;
  const item = ix.item(r.makes);
  const name = item.name.toLowerCase();
  // Armour is "chainmail", not "a chainmail".
  if (n === 1 && item.slot === "armor") return name;
  if (n > 1) return `${n} ${name.endsWith("s") ? name : `${name}s`}`;
  return `${/^[aeiou]/.test(name) ? "an" : "a"} ${name}`;
}

/** Why this job can't be queued right now, or undefined if it can. */
export function cantQueue(
  ix: Index,
  town: TownState,
  shopId: string,
  recipeId: string,
): string | undefined {
  const r = ix.recipe(recipeId);
  const shop = ix.building(shopId);
  if (r.workshop !== shopId) return `That isn't made at the ${shop.name}.`;
  if (!benches(ix, town, shopId)) return `The ${shop.name} isn't working.`;
  if ((town.buildings[shopId] ?? 0) < (r.level ?? 1))
    return `The ${shop.name} needs level ${r.level} for that.`;
  if (shopOf(town, shopId).queue.length >= ix.lib.workshops.queue)
    return `The ${shop.name}'s queue is full.`;
  const short = materialsShort(ix, town, r.materials);
  if (short) return `Short of ${short}.`;
  if (town.gold < (r.gold ?? 0)) return "Not enough gold.";
  return undefined;
}

/** Queue a job at a workshop: its materials and gold are paid now. */
export function queueJob(ix: Index, town: TownState, shopId: string, recipeId: string): TownState {
  const why = cantQueue(ix, town, shopId, recipeId);
  if (why) throw new TownError(why);
  const r = ix.recipe(recipeId);
  const t = edit(town);
  useMaterials(t, r.materials);
  book(t, "crafting", -(r.gold ?? 0));
  t.workshops ??= {};
  const shop = shopOf(t, shopId);
  shop.queue.push({ id: `j${t.nextThingId++}`, recipe: recipeId, done: 0 });
  t.workshops[shopId] = shop;
  return t;
}

/** Call a job off: everything it cost comes back, whatever work went in. */
export function cancelJob(ix: Index, town: TownState, shopId: string, jobId: string): TownState {
  const t = edit(town);
  const shop = t.workshops?.[shopId];
  const job = shop?.queue.find((j) => j.id === jobId);
  if (!shop || !job) throw new TownError("That job isn't in the queue.");
  const r = ix.recipe(job.recipe);
  shop.queue = shop.queue.filter((j) => j !== job);
  addMaterials(t, r.materials);
  book(t, "crafting", r.gold ?? 0);
  return t;
}

/** Which workshop a hero works at, if any. */
export const benchOf = (town: TownState, heroId: string): string | undefined =>
  Object.entries(town.workshops ?? {}).find(([, w]) => w.workers.includes(heroId))?.[0];

/** Take a hero off any bench (in place). */
export function leaveBench(t: TownState, heroId: string): void {
  for (const w of Object.values(t.workshops ?? {}))
    w.workers = w.workers.filter((x) => x !== heroId);
}

/**
 * Put a hero (or porter) at a workshop's bench, or take them off (`shopId`
 * undefined). One job at a time: it takes them off any post or desk.
 */
export function assignBench(
  ix: Index,
  town: TownState,
  heroId: string,
  shopId: string | undefined,
): TownState {
  if (!findHero(town, heroId)) throw new TownError("They aren't in the guild.");
  const t = edit(town);
  leaveBench(t, heroId);
  if (!shopId) return t;
  const shop = ix.building(shopId);
  const open = benches(ix, t, shopId);
  if (!open) throw new TownError(`The ${shop.name} isn't working.`);
  const w = shopOf(t, shopId);
  if (w.workers.length >= open) throw new TownError(`Every bench at the ${shop.name} is taken.`);
  for (const id of Object.keys(t.posts ?? {})) {
    t.posts[id] = t.posts[id]!.filter((x) => x !== heroId);
    if (!t.posts[id]!.length) delete t.posts[id];
  }
  if (t.research) t.research.desks = t.research.desks.filter((d) => d.hero !== heroId);
  t.workshops ??= {};
  w.workers.push(heroId);
  t.workshops[shopId] = w;
  return t;
}

/** Work a hero puts in on this recipe in a day. */
export function workRate(ix: Index, h: Hero, r: RecipeDef): number {
  const rules = ix.lib.workshops;
  const stat = heroSheet(ix, h).stats[r.stat];
  const rate = Math.max(rules.minDay, rules.perDay + (stat - 10) * rules.perStat);
  return Math.round(rate * (h.porter ? rules.porter : 1) * 100) / 100;
}

/** Can this hero work a bench today? At home, on their feet, and not nursing an injury. */
export const canWork = (h: Hero, away: ReadonlySet<string>) =>
  !away.has(h.id) && h.condition === "ok" && h.hp > 0 && !(h.injuries ?? []).length;

/** Townsfolk at a workshop's benches today (M7.15): in the seats the heroes leave. */
export function benchFolk(ix: Index, town: TownState, shopId: string): number {
  const seats = benches(ix, town, shopId) - (town.workshops?.[shopId]?.workers.length ?? 0);
  return Math.min(town.folk?.jobs[`workshop:${shopId}`] ?? 0, Math.max(0, seats));
}

/** Everyone working a workshop today: heroes at home and fit, then townsfolk. */
function hands(
  ix: Index,
  town: TownState,
  shopId: string,
  away: ReadonlySet<string>,
): { hero?: Hero; rate: (r: RecipeDef) => number }[] {
  const w = shopOf(town, shopId);
  const heroes = w.workers
    .slice(0, benches(ix, town, shopId))
    .map((id) => findHero(town, id))
    .filter((h): h is Hero => !!h && canWork(h, away))
    .map((h) => ({ hero: h, rate: (r: RecipeDef) => workRate(ix, h, r) }));
  const folk = Array.from({ length: benchFolk(ix, town, shopId) }, () => ({
    rate: () => ix.lib.workshops.settler,
  }));
  return [...heroes, ...folk];
}

/** Days left on the queue at today's pace (Infinity with nobody working). */
export function queueDays(ix: Index, town: TownState, shopId: string, away: ReadonlySet<string>) {
  const w = shopOf(town, shopId);
  const workers = hands(ix, town, shopId, away);
  return w.queue.map((job) => {
    const r = ix.recipe(job.recipe);
    const pace = workers.reduce((s, h) => s + h.rate(r), 0);
    return pace ? (r.work - job.done) / pace : Infinity;
  });
}

/**
 * A day at the workshops (end of each day). Returns the ids of heroes who
 * worked, so they only get part of a day's rest.
 */
export function workshopDay(ix: Index, t: TownState, away: ReadonlySet<string>): Set<string> {
  const worked = new Set<string>();
  for (const [shopId, w] of Object.entries(t.workshops ?? {})) {
    if (!w.queue.length) continue;
    const workers = hands(ix, t, shopId, away);
    if (!workers.length) continue;
    const made: RecipeDef[] = [];
    for (const h of workers) {
      if (h.hero) worked.add(h.hero.id);
      // Each worker's day goes on the front job; what's left over starts the next.
      let left = 1;
      while (left > 0 && w.queue.length) {
        const job: Job = w.queue[0]!;
        const r = ix.recipe(job.recipe);
        const rate = h.rate(r);
        const need = r.work - job.done;
        if (rate * left < need - 1e-9) {
          job.done = Math.round((job.done + rate * left) * 100) / 100;
          left = 0;
        } else {
          left -= need / rate;
          w.queue.shift();
          finish(ix, t, r);
          made.push(r);
        }
      }
    }
    if (made.length) {
      const counts = new Map<string, number>();
      for (const r of made) counts.set(r.id, (counts.get(r.id) ?? 0) + 1);
      const what = [...counts].map(([id, n]) => {
        const r = ix.recipe(id);
        if (r.name) return n > 1 ? `${r.name} (${n} times)` : r.name;
        return recipeWords(ix, { ...r, count: (r.count ?? 1) * n });
      });
      news(t, `The ${ix.building(shopId).name} finished ${listWords(what)}.`, "good");
    }
  }
  return worked;
}

/** A finished job: the goods go to the store or the store room. */
function finish(ix: Index, t: TownState, r: RecipeDef): void {
  const n = r.count ?? 1;
  if (ix.item(r.makes).slot === "material") addMaterials(t, { [r.makes]: n });
  else for (let i = 0; i < n; i++) t.stash.push(r.makes);
}

/** What a job costs, in words: "3 iron ore" or "2 planks and 10 gold". */
export function costWords(ix: Index, r: RecipeDef): string {
  const parts = [materialWords(ix, r.materials), r.gold ? `${r.gold} gold` : ""].filter(Boolean);
  return parts.join(" and ");
}

/** Take anyone who has left the guild off the benches. */
export function tidyBenches(t: TownState): void {
  for (const w of Object.values(t.workshops ?? {}))
    w.workers = w.workers.filter((x) => findHero(t, x));
}

/** Heroes at home with a bench, for the "one job at a time" check in other panels. */
export const busyAtBench = (town: TownState) =>
  new Set(Object.values(town.workshops ?? {}).flatMap((w) => w.workers));
