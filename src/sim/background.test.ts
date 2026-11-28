/**
 * Background trips (M7.02, DESIGN.md §17.1-17.3): parties stay out while the
 * town's days pass, the town only sees the clock and the day they're due,
 * and what happens below lands when they're back or someone finds them.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { heroNames, library } from "../content";
import { applyKills } from "./dungeon";
import { runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { importSave } from "./save";
import {
  assignPost,
  autoStart,
  awaySet,
  defence,
  forecast,
  postWorkers,
  cantLaunch,
  equip,
  giveUp,
  hire,
  kitOut,
  launch,
  launchAndWait,
  newTown,
  outingStatus,
  planRescue,
  rest,
  rosterSize,
  setOrders,
  toggleParty,
  usualDays,
  waitUntilBack,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const orders = (o: Partial<StandingOrders>): StandingOrders => ({
  targetFloor: 1,
  retreat: { kind: "hero-hp-below", percent: 30 },
  loot: "everything",
  ...o,
});

describe("a party out in the dungeon", () => {
  it("is away while the days pass, and the town can't touch its heroes", () => {
    const t0 = setOrders(ix, fresh(), orders({ targetFloor: 2 }));
    const t = launch(ix, t0, heroNames);
    expect(t.day).toBe(t0.day);
    expect(t.outings).toHaveLength(1);
    const o = t.outings[0]!;
    expect(o.heroes).toEqual(t0.party);
    expect([...awaySet(t)]).toEqual(t0.party);
    // Nobody picked for the next trip; the heroes stay on the roster, away.
    expect(t.party).toEqual([]);
    for (const id of o.heroes) expect(t.roster.some((h) => h.id === id)).toBe(true);
    const h = t.roster.find((x) => x.id === o.heroes[0])!;
    expect(() => equip(ix, t, h.id, "dagger")).toThrow(/away with/);
    expect(() => toggleParty(ix, t, h.id)).toThrow(/away with/);
    expect(cantLaunch(ix, { ...t, party: [h.id] })).toMatch(/away with/);
    // The town knows when to expect them, from the orders alone.
    expect(o.expected).toBe(t.day + usualDays(ix, o.result.orders));
    expect(t.news.at(-1)!.text).toMatch(/Expected back on day/);
    expect(t.trips).toEqual([]);
  });

  it("is expected back after about a day a floor", () => {
    for (const [floor, days] of [
      [1, 1],
      [2, 2],
      [3, 3],
    ] as const)
      expect(usualDays(ix, orders({ targetFloor: floor }))).toBe(days);
    expect(usualDays(ix, orders({ targetFloor: 1, clearPercent: 100 }))).toBeGreaterThan(1);
  });

  it("thins the dungeon night by night, and lands the rest on the day it's back", () => {
    for (let seed = 1; seed < 40; seed++) {
      const t0 = setOrders(ix, fresh(seed), orders({ targetFloor: 2 }));
      const t = launch(ix, t0, heroNames);
      const r = t.outings[0]!.result;
      if (r.outcome !== "returned" || r.days < 2 || !r.dayKills?.[1]) continue;
      // The first night's push-up only feels the first day's kills.
      const first = rest(ix, t, heroNames);
      const expected = applyKills(t.dungeon, r.dayKills[0] ?? {});
      const firstFloor = (d: typeof t.dungeon) => d.floors.map((f) => f.population);
      // (The night then breeds and pushes up as usual: compare against the same night.)
      const control = rest(ix, { ...t, outings: [], dungeon: expected }, heroNames);
      expect(firstFloor(first.dungeon)).toEqual(firstFloor(control.dungeon));
      expect(first.outings).toHaveLength(1);
      // Home on the day the trip ends.
      let after = first;
      while (after.outings.length) after = rest(ix, after, heroNames);
      expect(after.day).toBe(t.day + r.days);
      const trip = after.trips.at(-1)!;
      expect(trip.back).toBe(after.day);
      expect(trip.result.log).toEqual(r.log);
      expect(after.lastTrip).toEqual(trip);
      expect(after.news.some((n) => /is back after/.test(n.text))).toBe(true);
      // Nobody else was picked, so they're the party again (if nobody was lost or quit).
      if (!t0.party.every((id) => after.roster.some((h) => h.id === id))) continue;
      expect(after.party).toEqual(t0.party);
      return;
    }
    throw new Error("no two-day trip with kills on its second day");
  });

  it("lets two parties be out at once, and raids are fought by whoever is home", () => {
    let t = { ...fresh(3), gold: 2000 };
    t = setOrders(ix, t, orders({ targetFloor: 1 }));
    t = launch(ix, t, heroNames);
    // Hire a second party from whoever turns up.
    while (t.roster.length < Math.min(6, rosterSize(ix, t))) {
      if (!t.recruits.length) t = rest(ix, t, heroNames);
      if (!t.recruits.length) continue;
      t = hire(ix, t, t.recruits[0]!.id);
      t = kitOut(ix, t, t.roster.at(-1)!.id);
    }
    const home = t.roster.filter((h) => !awaySet(t).has(h.id));
    t = { ...t, party: home.slice(0, 3).map((h) => h.id) };
    if (!t.outings.length) return; // the first party came home while we were hiring: nothing to test
    t = launch(ix, t, heroNames);
    expect(t.outings).toHaveLength(2);
    expect(new Set(t.outings.flatMap((o) => o.heroes)).size).toBe(
      t.outings.reduce((s, o) => s + o.heroes.length, 0),
    );
    t = waitUntilBack(ix, t, heroNames);
    expect(t.outings.length).toBeLessThan(2);
  });
});

describe("overdue and possibly lost", () => {
  /** A trip that wipes on floor 3, and the town as the party sets off. */
  function wipe(): TownState {
    for (let seed = 0; seed < 300; seed++) {
      const t = launch(
        ix,
        setOrders(ix, fresh(seed), orders({ targetFloor: 3, retreat: { kind: "never" } })),
        heroNames,
      );
      if (t.outings[0]!.result.outcome === "wiped") return t;
    }
    throw new Error("no wipe");
  }

  it("is only worry: the clock and the day due, then overdue, then possibly lost", () => {
    let t = wipe();
    const o = t.outings[0]!;
    expect(() => planRescue(ix, t, o.id)).toThrow(/isn't due back/);
    while (t.day <= o.expected) {
      expect(outingStatus(ix, t, t.outings[0]!)).toBe("out");
      t = rest(ix, t, heroNames);
    }
    expect(outingStatus(ix, t, t.outings[0]!)).toBe("overdue");
    expect(t.news.some((n) => n.day === t.day && /overdue/.test(n.text))).toBe(true);
    t = rest(ix, t, heroNames);
    expect(outingStatus(ix, t, t.outings[0]!)).toBe("lost");
    expect(t.news.some((n) => /may be lost/.test(n.text))).toBe(true);
    // A search can go now, to the floor they were heading for.
    const planned = planRescue(ix, t, o.id, "rescue");
    expect(planned.orders).toMatchObject({ rescue: o.id, mission: "rescue", targetFloor: 3 });
  });

  it("can be given up for lost, freeing their places; if they come home, they're back", () => {
    // A party that's merely late (here, the town expected it far too soon):
    // give it up, then let it walk in.
    for (let seed = 0; seed < 300; seed++) {
      let t = launch(ix, setOrders(ix, fresh(seed), orders({ targetFloor: 2 })), heroNames);
      const o = t.outings[0]!;
      if (o.result.outcome !== "returned" || o.result.days < 2) continue;
      t.outings[0]!.expected = t.day - ix.lib.rescue.lostDays;
      expect(() => giveUp(ix, { ...t, outings: [{ ...o, expected: t.day }] }, o.id)).toThrow(
        /too soon/,
      );
      const before = t.roster.length;
      t = giveUp(ix, t, o.id);
      expect(t.roster.length).toBe(before - o.heroes.length);
      for (const id of o.heroes) expect(t.memorial.find((m) => m.heroId === id)?.fate).toBe("lost");
      while (t.outings.length) t = rest(ix, t, heroNames);
      const alive = o.result.party.filter((h) => h.condition !== "dead").map((h) => h.id);
      for (const id of alive) {
        expect(t.roster.some((h) => h.id === id)).toBe(true);
        expect(t.memorial.some((m) => m.heroId === id)).toBe(false);
      }
      return;
    }
    throw new Error("no trip ran late enough");
  });
});

describe("holing up", () => {
  /** A party that can't get home: it holes up instead of fighting to the end. */
  function holed(): { t: TownState; seed: number } {
    for (let seed = 0; seed < 600; seed++) {
      const t = launch(ix, setOrders(ix, fresh(seed), orders({ targetFloor: 3 })), heroNames);
      if (t.outings[0]!.result.outcome === "holed") return { t, seed };
    }
    throw new Error("nobody holed up");
  }

  it("happens on the way home, below floor 1, with the living waiting together", () => {
    const { t } = holed();
    const o = t.outings[0]!;
    const r = o.result;
    expect(r.holed!.floor).toBeGreaterThanOrEqual(ix.lib.rescue.holeUp.minFloor);
    const rules = ix.lib.rescue.holeUp;
    expect(r.holed!.supplies).toBeGreaterThanOrEqual(rules.baseDays);
    expect(r.holed!.supplies).toBeLessThanOrEqual(rules.maxDays);
    expect(r.log.at(-1)!.kind).toBe("holed");
    expect(r.haul).toEqual([]);
    // In town they're just away; below, their site waits with everyone alive in it.
    let after = t;
    while (after.outings[0]?.fell === undefined) after = rest(ix, after, heroNames);
    const site = after.sites.find((s) => s.outing === o.id)!;
    expect(site.holed).toBe(true);
    const living = r.party.filter((h) => h.condition !== "dead").map((h) => h.id);
    expect(site.trapped.map((x) => x.hero.id)).toEqual(expect.arrayContaining(living));
    for (const x of site.trapped) expect(x.until).toBe(after.day + r.holed!.supplies - 1);
  });

  it("ends with the party fighting its way home, or falling, if nobody comes", () => {
    const { t } = holed();
    const o = t.outings[0]!;
    let after = t;
    for (let i = 0; i < 40 && after.outings.length; i++) after = rest(ix, after, heroNames);
    expect(after.outings).toEqual([]);
    const home = o.heroes.filter((id) => after.roster.some((h) => h.id === id));
    if (home.length) expect(after.news.some((n) => /holed up/.test(n.text))).toBe(true);
    else for (const id of o.heroes) expect(after.memorial.some((m) => m.heroId === id)).toBe(true);
  });
});

describe("rescue missions", () => {
  it("travel light: slip past fights and leave the dead and the gear for a recovery", () => {
    let slipped = 0;
    let left = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const party = createStarterParty(ix, heroNames, createRng(seed));
      const body = createStarterParty(ix, heroNames, createRng(seed + 100))[0]!;
      const r = runExpedition(
        ix,
        party,
        orders({ targetFloor: 2, rescue: "s1", mission: "rescue" }),
        seed,
        undefined,
        {
          site: {
            id: "s1",
            floor: 2,
            room: 2,
            trapped: [],
            bodies: [
              { id: "b1", hero: { ...body, condition: "dead" }, gear: {}, died: 1, floor: 2 },
            ],
            items: [{ item: "sword", value: 10, estimate: 10, keep: true, owner: body.name }],
          },
        },
      );
      slipped += r.log.filter((e) => /quietly past/.test(e.text)).length;
      if (r.siteVisited) {
        left++;
        expect(r.bodies).toEqual([]);
        expect(r.siteBodiesLeft).toBe(true);
        expect(r.siteLeft).toHaveLength(1);
      }
    }
    expect(slipped).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
  });

  it("are too late for anyone who couldn't hold out until they got there", () => {
    const party = createStarterParty(ix, heroNames, createRng(5));
    const waiting = createStarterParty(ix, heroNames, createRng(6))[0]!;
    const r = runExpedition(ix, party, orders({ targetFloor: 1, rescue: "s1" }), 5, undefined, {
      site: {
        id: "s1",
        floor: 1,
        room: 1,
        trapped: [waiting],
        until: { [waiting.id]: 0 },
        bodies: [],
        items: [],
      },
    });
    expect(r.rescued).toEqual([]);
    expect(r.log.some((e) => /too late for/.test(e.text))).toBe(true);
  });
});

describe("saves from before background trips", () => {
  it("start with nobody out and the last trip in the list", () => {
    const text = readFileSync(join(import.meta.dirname, "fixtures", "saves", "v14.json"), "utf8");
    const t = importSave(ix, text);
    expect(t.outings).toEqual([]);
    expect(t.trips).toHaveLength(1);
    expect(t.trips[0]).toEqual(t.lastTrip);
    // And a trip still works the new way.
    const after = launchAndWait(ix, t, heroNames);
    expect(after.trips.length).toBeGreaterThanOrEqual(1);
  });
});

describe("posts while a party is down below", () => {
  it("leave an away hero's post empty until they're back (DESIGN.md §8)", () => {
    let t = setOrders(ix, fresh(), orders({}));
    const [a, b] = t.party;
    t = assignPost(ix, t, a!, "barricade");
    t = assignPost(ix, t, b!, "lookout");
    const bare = defence(ix, { ...t, posts: {} });
    expect(defence(ix, t, awaySet(t)) - bare).toBe(3);
    expect(forecast(ix, t).length).toBeGreaterThan(0);

    t = launch(ix, t, heroNames);
    // They keep the post for later, but hold nothing while they're away.
    expect(t.posts.barricade).toContain(a);
    expect(postWorkers(ix, t, "barricade", awaySet(t))).toEqual([]);
    expect(defence(ix, t, awaySet(t))).toBe(bare);
    // Nor does a lookout who's below see anything coming.
    expect(forecast(ix, t)).toEqual([]);
  });
});
