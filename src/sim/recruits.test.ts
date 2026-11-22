/**
 * M6 part 3: untrained recruits you train and kit out, the Tavern's trained
 * recruits, haggling at the Market, hidden caches and "clear the floor" orders.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { runExpedition, DEFAULT_ORDERS, tripDays } from "./expedition";
import { bestClass, createHero, heroSheet, trainRecruit } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { migrateTown } from "./save";
import {
  autoStart,
  haggler,
  haulPrice,
  hire,
  hirePrice,
  kitOut,
  launchAndWait,
  marketRate,
  newTown,
  rest,
  sellPrice,
  setOrders,
  TOWN_VERSION,
  upgrade,
  type TownState,
} from "./town";
import { stocked } from "./stocked";

const ix = indexLibrary(library);
const rules = library.town;
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const party = (classes: string[], seed = 1) =>
  classes.map((c, i) =>
    createHero(ix, { id: `h${i}`, name: heroNames[i]!, classId: c }, createRng(seed * 10 + i)),
  );

describe("untrained recruits", () => {
  it("are trained in the class the player picks, from their raw stats", () => {
    const r = newTown(ix, heroNames, 4).recruits[0]!;
    for (const c of library.classes) {
      const h = trainRecruit(ix, r, c.id);
      expect(h.classId).toBe(c.id);
      expect(h.untrained).toBeUndefined();
      expect(h.hp).toBe(heroSheet(ix, h).derived.maxHp);
      expect(h.motivation).toBe(r.motivation);
    }
    expect(r.classId).toBe(bestClass(ix, r.stats));
  });

  it("cost the hire fee once the free starting heroes are signed", () => {
    const t = rest(ix, fresh(), heroNames);
    for (const r of t.recruits.filter((x) => x.untrained))
      expect(hirePrice(ix, t, r)).toBe(rules.hireCost);
  });

  it("join empty-handed: Kit out fills the class kit from the store room, then the Market", () => {
    let t: TownState = {
      ...rest(ix, fresh(), heroNames),
      gold: 1000,
      stash: [],
    };
    t = hire(ix, t, t.recruits[0]!.id, "fighter");
    const h = t.roster.at(-1)!;
    expect(Object.values(h.equipment).filter(Boolean)).toEqual([]);
    expect(kitOut(ix, t, h.id, false).roster.at(-1)!.equipment).toEqual({});
    const gold = t.gold;
    t = kitOut(ix, t, h.id);
    expect(t.roster.at(-1)!.equipment.weapon).toBe("sword");
    expect(t.gold).toBeLessThan(gold);
  });

  it("'pick for me' gives each starting class to the recruit who suits it best", () => {
    const t0 = newTown(ix, heroNames, 2);
    const t = autoStart(ix, t0);
    expect(t.roster.map((h) => h.classId)).toEqual(rules.startingRoster);
    expect(t.freeHires).toBe(0);
    // Starting heroes signed by hand count towards the classes.
    const mage = hire(ix, t0, t0.recruits[0]!.id, "mage");
    const rest_ = autoStart(ix, mage);
    expect(rest_.roster.filter((h) => h.classId === "mage")).toHaveLength(1);
  });

  it("a Tavern at level 2 sends trained, kitted recruits, for the price of their kit", () => {
    let t: TownState = stocked({ ...fresh(), gold: 10_000 });
    for (let i = 0; i < 2; i++) {
      t = upgrade(ix, t, "tavern");
      while (t.construction.length) t = rest(ix, t, heroNames);
    }
    t = rest(ix, t, heroNames);
    const trained = t.recruits.filter((r) => !r.untrained);
    expect(trained.length).toBeGreaterThanOrEqual(1);
    expect(trained[0]!.equipment.weapon).toBeDefined();
    expect(hirePrice(ix, t, trained[0]!)).toBeGreaterThan(rules.hireCost);
  });
});

describe("haggling", () => {
  it("the best Appraisal and CHA in the guild talk the Market's cut down", () => {
    const t = fresh();
    const { hero, bonus } = haggler(ix, t);
    expect(bonus).toBeGreaterThanOrEqual(0);
    const sharp = {
      ...t.roster[0]!,
      stats: { ...t.roster[0]!.stats, CHA: 20, PER: 20 },
    };
    const better = haggler(ix, { ...t, roster: [sharp, ...t.roster.slice(1)] });
    expect(better.hero!.id).toBe(sharp.id);
    expect(better.bonus).toBeGreaterThan(bonus);
    expect(hero === undefined || t.roster.includes(hero)).toBe(true);
    const gem = ix.item("gem");
    expect(sellPrice(ix, gem, better.bonus)).toBeGreaterThan(sellPrice(ix, gem));
    expect(haulPrice(ix, "gem", 100, better.bonus)).toBeGreaterThan(haulPrice(ix, "gem", 100));
    // Never better than haggle.max.
    expect(marketRate(ix, rules.haulRate, 5)).toBe(Math.max(rules.haulRate, rules.haggle.max));
  });

  it("an empty guild gets the Market's usual rate", () => {
    expect(haggler(ix, newTown(ix, heroNames, 1)).bonus).toBe(0);
  });
});

describe("hidden caches", () => {
  const always: Library = {
    ...library,
    searching: { ...library.searching, chancePerRoom: 1 },
  };
  const aix = indexLibrary(always);

  it("a sharp scout finds far more than a party without one", () => {
    let withScout = 0;
    let without = 0;
    for (let s = 1; s <= 40; s++) {
      const a = runExpedition(aix, party(["fighter", "scout", "mage"], s), DEFAULT_ORDERS, s);
      const b = runExpedition(aix, party(["fighter", "cleric", "mage"], s), DEFAULT_ORDERS, s);
      withScout += a.secrets.found;
      without += b.secrets.found;
      if (a.secrets.found) expect(a.log.some((e) => e.kind === "secret")).toBe(true);
    }
    expect(withScout).toBeGreaterThan(without * 2);
  });

  it("don't change the rest of the trip", () => {
    const none: Library = {
      ...library,
      searching: { ...library.searching, chancePerRoom: 0 },
    };
    const p = party(["fighter", "cleric", "mage"], 3);
    const a = runExpedition(indexLibrary(none), p, DEFAULT_ORDERS, 3);
    const b = runExpedition(aix, p, DEFAULT_ORDERS, 3);
    // Nobody found anything, so the trip is the same, room for room.
    if (!b.secrets.found) expect(b.log.map((e) => e.text)).toEqual(a.log.map((e) => e.text));
    expect(a.secrets).toEqual({ found: 0, missed: 0 });
  });

  it("are tallied in town, with the gold they brought in", () => {
    let t = fresh(5);
    for (let i = 0; i < 6; i++) t = launchAndWait(ix, rest(ix, t, heroNames), heroNames);
    expect(t.secrets.found + t.secrets.missed).toBeGreaterThan(0);
    if (t.secrets.found) expect(t.secrets.gold).toBeGreaterThan(0);
  });
});

describe("clear the floor", () => {
  it("keeps the party hunting until enough of the floor is dead, and costs days", () => {
    let more = 0;
    for (let s = 1; s <= 10; s++) {
      const t = fresh(s);
      const plain = launchAndWait(ix, t, heroNames).lastTrip!.result;
      const hunt = launchAndWait(ix, setOrders(ix, t, { ...t.orders, clearPercent: 75 }), heroNames)
        .lastTrip!.result;
      const goal = Math.ceil(t.dungeon.floors[0]!.population * 0.75);
      if (hunt.outcome !== "returned") continue;
      expect(
        (hunt.floorKills[1] ?? 0) >= goal ||
          hunt.huntRooms >= library.dungeon.hunting.maxRooms ||
          hunt.log.some((e) => /hunted as long/.test(e.text)),
      ).toBe(true);
      // Each side tunnel takes time, and the days come from the clock.
      expect(hunt.hours!).toBeGreaterThanOrEqual(hunt.huntRooms * library.time.hunt);
      expect(hunt.days).toBe(tripDays(library.time.startHour, hunt.hours!));
      if ((hunt.floorKills[1] ?? 0) > (plain.floorKills[1] ?? 0)) more++;
    }
    expect(more).toBeGreaterThan(5);
  });

  it("is ignored on rescue runs and in the sandbox (no population to count)", () => {
    const r = runExpedition(
      ix,
      party(["fighter", "scout", "mage"]),
      {
        ...DEFAULT_ORDERS,
        clearPercent: 100,
      },
      1,
    );
    expect(r.huntRooms).toBe(0);
  });
});

describe("saves", () => {
  it("version 6 saves get no free hires and an empty cache tally", () => {
    const old = JSON.parse(JSON.stringify(fresh())) as Record<string, unknown>;
    old.version = 6;
    delete old.freeHires;
    delete old.secrets;
    const up = migrateTown(ix, old)!;
    expect(up.version).toBe(TOWN_VERSION);
    expect(up.freeHires).toBe(0);
    expect(up.secrets).toEqual({ found: 0, missed: 0, gold: 0 });
    expect(launchAndWait(ix, up, heroNames).day).toBeGreaterThan(up.day);
  });
});
