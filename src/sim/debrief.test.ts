/**
 * The debrief (M7.03, DESIGN.md §17.4): coins to the purse, the rest of the
 * haul held until the player sells, salvages or keeps it, and the trip's tally.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { indexLibrary } from "./library";
import {
  autoStart,
  haulPlan,
  haulPrice,
  haulSale,
  launchAndWait,
  newTown,
  salvageList,
  salvageOf,
  salvageStash,
  setHaulRule,
  settleByRule,
  settleHaul,
  tripTally,
  TownError,
  type TownState,
} from "./town";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);

/** A floor-2 trip that brought home something other than coins and materials. */
function cameHome(): TownState {
  for (let seed = 1; seed < 60; seed++) {
    let t = autoStart(ix, newTown(ix, heroNames, seed));
    t = { ...t, orders: { ...t.orders, targetFloor: 2 } };
    t = launchAndWait(ix, t, heroNames);
    if (t.lastTrip?.held && t.lastTrip.result.outcome !== "wiped") return t;
  }
  throw new Error("no trip brought home any loot");
}
const home = cameHome();
const withSmith = (t: TownState, level = 1): TownState => ({
  ...t,
  buildings: { ...t.buildings, blacksmith: level },
});

describe("the haul comes home", () => {
  it("pays the coins at once and holds everything else for the debrief", () => {
    const trip = home.lastTrip!;
    const isCoins = (id: string) => ix.item(id).tags.includes("coins");
    const isMaterial = (id: string) => ix.item(id).slot === "material";
    const loot = trip.result.haul.filter((h) => !h.keep);
    const coins = loot.filter((h) => isCoins(h.item)).reduce((s, h) => s + h.value, 0);
    expect(trip.coins).toBe(coins);
    const held = loot.filter((h) => !isCoins(h.item) && !isMaterial(h.item));
    expect(trip.held).toBe(held.length);
    expect(home.haul.map((h) => h.item).sort()).toEqual(held.map((h) => h.item).sort());
    for (const h of home.haul) {
      expect(h.from).toBe(trip.name);
      expect(h.day).toBe(trip.back);
    }
    // What it's all worth still counts for morale and the news.
    expect(trip.goldEarned).toBeGreaterThanOrEqual(coins);
    const paid = home.ledger.filter((l) => l.kind === "haul").reduce((s, l) => s + l.amount, 0);
    expect(paid).toBe(coins);
  });

  it("is sold at the haul rate, haggled by whoever is at home", () => {
    const ids = Object.fromEntries(home.haul.map((h) => [h.id, "sell" as const]));
    const worth = home.haul.reduce((s, h) => s + haulSale(ix, home, h), 0);
    const t = settleHaul(ix, home, ids);
    expect(t.haul).toEqual([]);
    expect(t.gold).toBe(home.gold + worth);
    for (const h of home.haul)
      expect(haulSale(ix, home, h)).toBeGreaterThanOrEqual(haulPrice(ix, h.item, h.value));
    expect(t.news.at(-1)!.text).toMatch(/sold/);
  });

  it("can be kept in the store room", () => {
    const first = home.haul[0]!;
    const t = settleHaul(ix, home, { [first.id]: "keep" });
    expect(t.haul).toHaveLength(home.haul.length - 1);
    expect(t.stash.filter((x) => x === first.item).length).toBe(
      home.stash.filter((x) => x === first.item).length + 1,
    );
    expect(t.gold).toBe(home.gold);
  });

  it("can't be settled twice", () => {
    const first = home.haul[0]!;
    const t = settleHaul(ix, home, { [first.id]: "sell" });
    expect(() => settleHaul(ix, t, { [first.id]: "sell" })).toThrow(TownError);
  });
});

describe("salvage", () => {
  it("needs a working Blacksmith", () => {
    expect(salvageOf(ix, home, "rusty-helmet")).toBeUndefined();
    const helmet = { ...home.haul[0]!, item: "rusty-helmet" };
    const t = { ...home, haul: [helmet] };
    expect(() => settleHaul(ix, t, { [helmet.id]: "salvage" })).toThrow(/Blacksmith/);
    const broken = { ...withSmith(t), damaged: ["blacksmith"] };
    expect(() => settleHaul(ix, broken, { [helmet.id]: "salvage" })).toThrow(/Blacksmith/);
  });

  it("yields 60%, 80% and 100% of the list by the Blacksmith's level, at least 1 of each", () => {
    expect(salvageList(ix, "chainmail")).toEqual({ "iron-ore": 4 });
    expect(salvageOf(ix, withSmith(home, 1), "chainmail")).toEqual({ "iron-ore": 2 });
    expect(salvageOf(ix, withSmith(home, 2), "chainmail")).toEqual({ "iron-ore": 3 });
    expect(salvageOf(ix, withSmith(home, 3), "chainmail")).toEqual({ "iron-ore": 4 });
    expect(salvageOf(ix, withSmith(home, 1), "dagger")).toEqual({ "iron-ore": 1 });
  });

  it("gives scrap by tag for items without a list, and nothing for gems and coins", () => {
    expect(ix.item("rusty-helmet").salvage).toBeUndefined();
    expect(salvageList(ix, "rusty-helmet")).toEqual({ "iron-ore": 1 });
    expect(salvageList(ix, "gem")).toBeUndefined();
    expect(salvageList(ix, "coins")).toBeUndefined();
    expect(salvageList(ix, "iron-ore")).toBeUndefined();
  });

  it("turns held haul into materials in the store", () => {
    const helmet = { ...home.haul[0]!, item: "rusty-helmet" };
    const t = settleHaul(ix, withSmith({ ...home, haul: [helmet] }), { [helmet.id]: "salvage" });
    expect(t.materials["iron-ore"] ?? 0).toBe((home.materials["iron-ore"] ?? 0) + 1);
    expect(t.haul).toEqual([]);
    expect(t.gold).toBe(home.gold);
    expect(t.news.at(-1)!.text).toMatch(/broke one piece down into 1 iron ore/);
  });

  it("works on the store room too", () => {
    const t = withSmith({ ...home, stash: [...home.stash, "chainmail"] }, 2);
    const after = salvageStash(ix, t, "chainmail");
    expect(after.stash.length).toBe(t.stash.length - 1);
    expect(after.materials["iron-ore"] ?? 0).toBe((t.materials["iron-ore"] ?? 0) + 3);
    expect(() => salvageStash(ix, after, "gem")).toThrow(TownError);
  });

  it("lists only materials, and validation says when it doesn't", () => {
    const bad: Library = {
      ...library,
      items: library.items.map((i) => (i.id === "dagger" ? { ...i, salvage: { gem: 1 } } : i)),
    };
    expect(validateLibrary(bad).join("\n")).toMatch(/dagger.*"gem" isn't a material/);
  });
});

describe("the haul rule", () => {
  const helmet = { ...home.haul[0]!, id: "x1", item: "rusty-helmet" };
  const gem = { ...home.haul[0]!, id: "x2", item: "gem" };
  const t = withSmith({ ...home, haul: [helmet, gem] });

  it("proposes selling everything by default", () => {
    expect(t.haulRule).toBe("sell");
    expect(haulPlan(ix, t)).toEqual({ x1: "sell", x2: "sell" });
  });

  it("can salvage what breaks down and sell the rest, or keep it all", () => {
    expect(haulPlan(ix, setHaulRule(ix, t, "salvage"))).toEqual({ x1: "salvage", x2: "sell" });
    expect(haulPlan(ix, setHaulRule(ix, t, "keep"))).toEqual({ x1: "keep", x2: "keep" });
    // Without a Blacksmith, salvage falls back to selling.
    const noSmith = { ...setHaulRule(ix, t, "salvage"), buildings: home.buildings };
    expect(haulPlan(ix, noSmith)).toEqual({ x1: "sell", x2: "sell" });
  });

  it("settles everything in one go", () => {
    const after = settleByRule(ix, setHaulRule(ix, t, "salvage"));
    expect(after.haul).toEqual([]);
    expect(after.materials["iron-ore"] ?? 0).toBe((t.materials["iron-ore"] ?? 0) + 1);
    expect(after.gold).toBeGreaterThan(t.gold);
  });
});

describe("the tally", () => {
  const trip = home.lastTrip!;
  const tally = tripTally(ix, trip);

  it("counts rooms, floors and time below", () => {
    expect(tally.rooms).toBe(trip.result.roomsVisited);
    expect(tally.deepest).toBe(trip.result.deepestFloor);
    expect(tally.hours).toBe(trip.result.hours);
    expect(tally.floors.map((f) => f.floor)).toEqual([1, 2]);
    for (const f of tally.floors) {
      expect(f.rooms.length).toBeGreaterThan(0);
      expect(f.rooms.every((r) => r.name && !r.name.endsWith("."))).toBe(true);
    }
    expect(tally.caches).toBe(trip.result.secrets.found);
  });

  it("lists every monster slain, by kind and by who killed it", () => {
    expect(tally.slainTotal).toBe(trip.result.kills.length);
    const byHero: Record<string, number> = {};
    for (const l of tally.slain)
      for (const [who, n] of Object.entries(l.by)) if (who) byHero[who] = (byHero[who] ?? 0) + n;
    for (const h of trip.party) expect(byHero[h.name] ?? 0).toBe(trip.kills[h.id] ?? 0);
    for (const l of tally.slain) expect(ix.monster(l.id).name).toBe(l.name);
    if (tally.slainTotal) expect(trip.party.map((h) => h.name)).toContain(tally.biggest!.by);
  });

  it("counts the haul as pieces, coins and materials", () => {
    expect(tally.pieces).toBe(trip.held);
    expect(tally.coins).toBe(trip.coins);
  });
});
