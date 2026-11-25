/**
 * Dig sites (M8.20, DESIGN.md §20): building on held floors. A forward camp,
 * a mine, a shrine over a cleansed stone, a den over a bound one.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { StoneSeal } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition, startFloor, type StandingOrders } from "./expedition";
import { createStarterParty } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { exportSave, importSave } from "./save";
import {
  autoStart,
  cantDig,
  dig,
  digView,
  forwardCamp,
  newTown,
  rest,
  restMorale,
  siteWorks,
  usualDays,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const CLEANSED = "seal-stone-diggings-cleansed";
const BOUND = "seal-stone-diggings-bound";

const gate = (stone: string, over: Partial<StoneSeal> = {}): StoneSeal => ({
  stone,
  day: 1,
  setting: "shut",
  strain: 0,
  level: 1,
  damaged: false,
  ...over,
});

/** A town holding floor 1 (and optionally more), rich, with floor 1 hunted quiet. */
function held(stones: Record<number, StoneSeal> = { 1: gate(CLEANSED) }): TownState {
  const t = autoStart(ix, newTown(ix, heroNames, 2));
  const floors = t.dungeon.floors.map((f) => ({ ...f, population: 5 }));
  return {
    ...t,
    gold: 5000,
    materials: {
      planks: 60,
      "iron-bands": 20,
      "bone-dust": 10,
      "spider-silk": 10,
      "iron-ore": 0,
    },
    dungeon: { ...t.dungeon, floors, stones },
  };
}

/** Rest until the diggers are done (at most `n` days). */
function waitDug(t: TownState, n = 12): TownState {
  for (let i = 0; i < n; i++) {
    const busy = Object.values(t.digs).some((s) => Object.values(s).some((x) => x.work));
    if (!busy) break;
    t = rest(ix, t, heroNames);
    // Keep the held floors quiet, as a guild hunting them would.
    t.dungeon.floors.forEach((f) => (f.population = Math.min(f.population, 5)));
  }
  return t;
}

describe("building dig sites", () => {
  it("only on a held floor, and only while it's quiet", () => {
    const t = held({});
    expect(cantDig(ix, t, 1, "mine")).toMatch(/isn't held/);
    const busy = held();
    busy.dungeon.floors[0]!.population = 39;
    expect(cantDig(ix, busy, 1, "mine")).toMatch(/too busy/);
    const breached = held({ 1: gate(CLEANSED, { damaged: true }) });
    expect(cantDig(ix, breached, 1, "mine")).toMatch(/breached/);
    expect(cantDig(ix, held(), 1, "mine")).toBeUndefined();
  });

  it("pays, then the diggers take their days", () => {
    const t0 = held();
    let t = dig(ix, t0, 1, "mine");
    const lvl = library.digSites.find((d) => d.id === "mine")!.levels[0]!;
    expect(t.gold).toBe(t0.gold - lvl.cost);
    expect(t.digs[1]!.mine!.level).toBe(0);
    expect(cantDig(ix, t, 1, "mine")).toMatch(/already at it/);
    t = waitDug(t);
    expect(t.digs[1]!.mine!.level).toBe(1);
    expect(t.news.some((n) => /mine on floor 1 is dug out/.test(n.text))).toBe(true);
  });

  it("a floor has only so many slots", () => {
    let t = held();
    t = dig(ix, t, 1, "mine");
    t = dig(ix, t, 1, "forward-camp");
    expect(cantDig(ix, t, 1, "shrine")).toMatch(/room for 2/);
  });

  it("the shrine wants a cleansed stone, the den a bound one", () => {
    expect(cantDig(ix, held(), 1, "den")).toMatch(/bound/);
    expect(cantDig(ix, held({ 1: gate(BOUND) }), 1, "shrine")).toMatch(/cleansed/);
    expect(cantDig(ix, held({ 1: gate(BOUND) }), 1, "den")).toBeUndefined();
    const view = digView(ix, held());
    expect(view[0]!.sites.map((s) => s.def.id)).not.toContain("den");
  });
});

describe("working sites", () => {
  it("a mine sends ore up every day, and deep-silver from floor 3 down", () => {
    const stones = { 1: gate(CLEANSED), 3: gate("seal-stone-bone-halls-cleansed") };
    let t = waitDug(dig(ix, dig(ix, held(stones), 1, "mine"), 3, "mine"));
    const ore = t.materials["iron-ore"] ?? 0;
    const silver = t.materials["deep-silver"] ?? 0;
    for (let i = 0; i < 5; i++) {
      t = rest(ix, t, heroNames);
      t.dungeon.floors.forEach((f) => (f.population = 5));
    }
    expect((t.materials["iron-ore"] ?? 0) - ore).toBe(10);
    expect((t.materials["deep-silver"] ?? 0) - silver).toBe(1);
  });

  it("stop while the floor fills up or the gateway breaches, and never go away", () => {
    let t = waitDug(dig(ix, held(), 1, "mine"));
    expect(siteWorks(ix, t, 1, "mine")).toBe(true);
    t.dungeon.floors[0]!.population = 39;
    expect(siteWorks(ix, t, 1, "mine")).toBe(false);
    t.dungeon.floors[0]!.population = 5;
    t.dungeon.stones[1] = gate(CLEANSED, { damaged: true });
    expect(siteWorks(ix, t, 1, "mine")).toBe(false);
    expect(t.digs[1]!.mine!.level).toBe(1);
  });

  it("a shrine lifts spirits in town", () => {
    const t0 = held();
    const t = waitDug(dig(ix, t0, 1, "shrine"));
    expect(restMorale(ix, t)).toBe(restMorale(ix, t0) + 1);
  });
});

describe("the forward camp", () => {
  const camp = { floor: 2, path: 1, rest: 50 };

  it("the party walks the paths down to it and sleeps there on the way deeper", () => {
    expect(startFloor(3, 0, camp)).toEqual({ first: 3, cage: 0, path: 2, camp: true });
    // Its own floor: the paths above it, but no night at the camp.
    expect(startFloor(2, 0, camp)).toEqual({ first: 2, cage: 0, path: 1, camp: false });
    // The cage goes past it.
    expect(startFloor(5, 3, camp)).toEqual({ first: 4, cage: 3, path: 0, camp: false });
    // Never past a floor a rescue party has to search.
    expect(startFloor(4, 0, camp, 1).first).toBe(1);
  });

  it("takes less time than walking the floors' rooms", () => {
    const orders: StandingOrders = { ...DEFAULT_ORDERS, targetFloor: 3 };
    expect(usualDays(ix, orders, 0, camp)).toBeLessThanOrEqual(usualDays(ix, orders));
    const heroes = createStarterParty(ix, heroNames, createRng(4), ["fighter", "cleric", "mage"]);
    const r = runExpedition(ix, heroes, orders, 9, undefined, { camp });
    expect(r.log.some((e) => /guild's paths down through floors 1 to 2/.test(e.text))).toBe(true);
    expect(r.log.some((e) => /forward camp on floor 2/.test(e.text))).toBe(true);
    expect(r.log.some((e) => e.kind === "floor" && /Floor 1:/.test(e.text))).toBe(false);
  });

  it("goes with every party once one works", () => {
    const t = waitDug(dig(ix, held(), 1, "forward-camp"));
    expect(forwardCamp(ix, t)).toMatchObject({ floor: 1 });
    expect(forwardCamp(ix, held())).toBeUndefined();
  });
});

describe("saves", () => {
  it("keep the sites", () => {
    const t = dig(ix, held(), 1, "mine");
    expect(importSave(ix, exportSave(t, new Date(0))).digs).toEqual(t.digs);
  });
});
