/**
 * Scout missions and floor intel (M7.08, DESIGN.md §17.8): a scout party
 * slips past fights where its best scout can, never hunts, and brings home
 * what it saw on each floor for the scouting report.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty } from "./hero";
import { indexLibrary } from "./library";
import { scoutingReport } from "./report";
import { createRng } from "./rng";
import { missingContent } from "./save";
import {
  autoStart,
  launch,
  launchAndWait,
  newTown,
  saveParty,
  pickParty,
  setOrders,
  usualDays,
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
const party = (seed: number) => createStarterParty(ix, heroNames, createRng(seed));

describe("a scout trip", () => {
  it("slips past fights, counts what it meets, and writes up each floor", () => {
    let slipped = 0;
    let fights = 0;
    let delveFights = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runExpedition(ix, party(seed), orders({ targetFloor: 2, mission: "scout" }), seed);
      const d = runExpedition(ix, party(seed), orders({ targetFloor: 2 }), seed);
      slipped += r.slipped ?? 0;
      fights += r.log.filter((e) => e.kind === "fight" && e.monsters).length;
      delveFights += d.log.filter((e) => e.kind === "fight" && e.monsters).length;
      expect(d.intel).toBeUndefined();
      if (r.outcome === "wiped") {
        expect(r.intel).toEqual([]);
        continue;
      }
      expect(r.intel!.length).toBeGreaterThan(0);
      for (const i of r.intel!) {
        expect(i.rooms).toBeGreaterThan(0);
        expect(i.rooms).toBeLessThanOrEqual(i.of);
        expect(i.slipped).toBeLessThanOrEqual(i.groups);
        // Everything counted was met, so it's known.
        for (const id of Object.keys(i.monsters)) expect(r.seen).toContain(id);
        for (const id of i.hazards) expect(ix.room(id).trap).toBeDefined();
      }
    }
    expect(slipped).toBeGreaterThan(0);
    // It fights less than a delve party sent the same way.
    expect(fights).toBeLessThan(delveFights);
  });

  it("never hunts, even with a clear-the-floor order", () => {
    const o = orders({ targetFloor: 1, mission: "scout", clearPercent: 100 });
    const r = runExpedition(ix, party(3), o, 3);
    expect(r.huntRooms).toBe(0);
    expect(usualDays(ix, o)).toBe(usualDays(ix, orders({ targetFloor: 1 })));
  });

  it("is ignored on a search", () => {
    const r = runExpedition(
      ix,
      party(4),
      orders({ targetFloor: 1, mission: "scout", rescue: "nobody" }),
      4,
    );
    expect(r.intel).toBeUndefined();
  });
});

describe("floor intel in town", () => {
  const scouted = (): TownState => {
    let t = setOrders(ix, fresh(), orders({ targetFloor: 1, mission: "scout" }));
    t = launchAndWait(ix, t, heroNames);
    return t;
  };

  it("lands when the scouts are home, dated, and feeds the scouting report", () => {
    const t = scouted();
    const i = t.intel?.[1];
    expect(i).toBeDefined();
    expect(i!.day).toBeGreaterThanOrEqual(1);
    expect(i!.by).toBeTruthy();
    expect(t.news.some((n) => /mapped floor 1/.test(n.text))).toBe(true);
    const r = scoutingReport(ix, t, 1, []);
    expect(r.intel?.stale).toBe(false);
    expect(r.intel?.population).toBe(i!.population);
    const counted = r.monsters.reduce((s, m) => s + (m.counted ?? 0), 0);
    expect(counted).toBe(Object.values(i!.monsters).reduce((s, n) => s + n, 0));
    expect(missingContent(ix, t)).toEqual([]);
    // No intel for floors nobody scouted.
    expect(scoutingReport(ix, t, 3, []).intel).toBeUndefined();
  });

  it("goes stale after a while", () => {
    const t = scouted();
    const later = { ...t, day: t.intel![1]!.day + ix.lib.scouting.staleDays + 1 };
    const r = scoutingReport(ix, later, 1, []);
    expect(r.intel?.stale).toBe(true);
    expect(r.warnings.some((w) => /out of date/.test(w))).toBe(true);
  });

  it("a scout mission is a one-off, unless the party is on file as scouts", () => {
    let t = setOrders(ix, fresh(), orders({ targetFloor: 1, mission: "scout" }));
    t = saveParty(ix, t, 0);
    expect(t.parties[0]!.orders.mission).toBe("scout");
    const sent = launch(ix, t, heroNames);
    expect(sent.orders.mission).toBeUndefined();
    expect(sent.outings[0]!.result.orders.mission).toBe("scout");
    expect(sent.news.at(-1)!.text).toMatch(/to scout floor 1/);
    const back = pickParty(ix, { ...t, orders: orders({}) }, 0);
    expect(back.orders.mission).toBe("scout");
  });

  it("scouts don't sulk about coming home empty-handed", () => {
    const t = scouted();
    const trip = t.trips.at(-1)!;
    for (const changes of Object.values(trip.morale ?? {}))
      expect(changes.some((c) => /empty/i.test(c.reason))).toBe(false);
  });
});
