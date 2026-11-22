/**
 * Workshops (M7.14, DESIGN.md §18.1): benches, queues, recipes and the work.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  assignBench,
  assignPost,
  benchOf,
  benches,
  cancelJob,
  cantQueue,
  autoStart,
  newTown,
  openWorkshops,
  queueJob,
  rest,
  workRate,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const rules = library.workshops;
const withMill = (seed = 1): TownState => {
  const t = autoStart(ix, newTown(ix, heroNames, seed));
  return {
    ...t,
    posts: {},
    buildings: { ...t.buildings, sawmill: 1, blacksmith: 1 },
    materials: { timber: 5, "iron-ore": 6 },
  };
};

describe("workshops", () => {
  it("are the buildings with benches, built and standing", () => {
    const t = withMill();
    expect(openWorkshops(ix, t).sort()).toEqual(["blacksmith", "sawmill"]);
    expect(benches(ix, t, "sawmill")).toBe(1);
    expect(benches(ix, { ...t, damaged: ["sawmill"] }, "sawmill")).toBe(0);
    expect(benches(ix, { ...t, buildings: { ...t.buildings, sawmill: 2 } }, "sawmill")).toBe(2);
  });

  it("take the materials when a job is queued, and give them back if it's called off", () => {
    const t = queueJob(ix, withMill(), "sawmill", "planks");
    expect(t.materials.timber).toBe(4);
    expect(t.workshops!.sawmill!.queue).toHaveLength(1);
    const back = cancelJob(ix, t, "sawmill", t.workshops!.sawmill!.queue[0]!.id);
    expect(back.materials.timber).toBe(5);
    expect(back.workshops!.sawmill!.queue).toEqual([]);
    // Not enough materials, or too low a level.
    expect(cantQueue(ix, { ...t, materials: {} }, "sawmill", "planks")).toMatch(/Short of/);
    expect(cantQueue(ix, t, "blacksmith", "scale-mail")).toMatch(/level 2/);
    expect(cantQueue(ix, t, "sawmill", "iron-sword")).toMatch(/isn't made/);
  });

  it("make things a day at a time with someone at the bench", () => {
    let t = queueJob(ix, withMill(), "blacksmith", "iron-sword");
    const smith = t.roster[0]!;
    // Nobody at the bench: nothing happens.
    t = rest(ix, t, heroNames);
    expect(t.workshops!.blacksmith!.queue[0]!.done).toBe(0);
    t = assignBench(ix, t, smith.id, "blacksmith");
    expect(benchOf(t, smith.id)).toBe("blacksmith");
    const rate = workRate(ix, smith, ix.recipe("iron-sword"));
    expect(rate).toBeGreaterThanOrEqual(rules.minDay);
    const swords = t.stash.filter((x) => x === "iron-sword").length;
    for (let d = 0; d < 20 && t.workshops!.blacksmith!.queue.length; d++)
      t = rest(ix, t, heroNames);
    expect(t.workshops!.blacksmith!.queue).toEqual([]);
    expect(t.stash.filter((x) => x === "iron-sword").length).toBe(swords + 1);
    expect(t.news.some((n) => n.text === "The Blacksmith finished an iron sword.")).toBe(true);
  });

  it("put materials they make in the store, leftover work starting the next job", () => {
    let t = withMill();
    t = queueJob(ix, queueJob(ix, t, "sawmill", "planks"), "sawmill", "planks");
    const strong = { ...t.roster[0]!, stats: { ...t.roster[0]!.stats, STR: 30 } };
    t = { ...t, roster: [strong, ...t.roster.slice(1)] };
    t = assignBench(ix, t, strong.id, "sawmill");
    // STR 30 gets through 3 jobs' worth a day: both done in one day.
    t = rest(ix, t, heroNames);
    expect(t.materials.planks).toBe(4);
    expect(t.workshops!.sawmill!.queue).toEqual([]);
  });

  it("are one job at a time: a bench takes a hero off their post, and a post off the bench", () => {
    let t = withMill();
    const id = t.roster[0]!.id;
    t = assignPost(ix, t, id, "lookout");
    t = assignBench(ix, t, id, "sawmill");
    expect(t.posts.lookout ?? []).not.toContain(id);
    t = assignPost(ix, t, id, "lookout");
    expect(benchOf(t, id)).toBeUndefined();
    t = assignBench(ix, t, id, "sawmill");
    expect(() => assignBench(ix, t, t.roster[1]!.id, "sawmill")).toThrow(/taken/);
  });

  it("are only part of a day's rest", () => {
    let t = queueJob(ix, withMill(), "blacksmith", "iron-sword");
    const [a, b] = t.roster;
    const hurt = (h: typeof a) => ({ ...h!, hp: 1 });
    t = { ...t, roster: [hurt(a), hurt(b), ...t.roster.slice(2)] };
    t = assignBench(ix, t, a!.id, "blacksmith");
    t = rest(ix, t, heroNames);
    const worker = t.roster.find((h) => h.id === a!.id)!;
    const idle = t.roster.find((h) => h.id === b!.id)!;
    expect(worker.hp - 1).toBeLessThan(idle.hp - 1);
  });
});
