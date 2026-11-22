/**
 * M7.01: the trip clock (DESIGN.md §17.2, content/time.ts). Every room, fight
 * and flight of stairs takes hours; the town's days come from them.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import {
  DEFAULT_ORDERS,
  runExpedition,
  timeBelow,
  tripClock,
  tripDays,
  type StandingOrders,
} from "./expedition";
import { createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const time = library.time;
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({
  ...DEFAULT_ORDERS,
  retreat: { kind: "never" },
  ...o,
});
/** A party nothing on floors 1-5 can hurt much, for testing the clock and not the fighting. */
const tough = (seed = 1): Hero[] =>
  createStarterParty(ix, heroNames, createRng(seed)).map((h) => ({
    ...h,
    stats: { ...h.stats, STR: 30, END: 30, DEX: 30 },
    hp: 999,
  }));

describe("the clock's arithmetic", () => {
  it("turns hours into a day of the trip and a time", () => {
    expect(tripClock(8, 0)).toEqual({ day: 1, time: "08:00" });
    expect(tripClock(8, 6.5)).toEqual({ day: 1, time: "14:30" });
    expect(tripClock(8, 16)).toEqual({ day: 2, time: "00:00" });
    expect(tripClock(8, 30.1)).toEqual({ day: 2, time: "14:06" });
  });

  it("says how long the party was below", () => {
    expect(timeBelow(0)).toBe("0 hours");
    expect(timeBelow(1)).toBe("1 hour");
    expect(timeBelow(20.4)).toBe("20 hours");
    expect(timeBelow(24)).toBe("1 day");
    expect(timeBelow(79)).toBe("3 days, 7 hours");
  });

  it("counts the days the town lives through: the midnights crossed, at least one", () => {
    expect(tripDays(8, 3)).toBe(1);
    expect(tripDays(8, 15.9)).toBe(1);
    expect(tripDays(8, 30)).toBe(1);
    expect(tripDays(8, 40)).toBe(2);
    expect(tripDays(8, 72)).toBe(3);
  });
});

describe("a trip's clock", () => {
  it("only runs forwards, and every trip line has a time", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = runExpedition(ix, tough(seed), orders({ targetFloor: 3 }), seed);
      let last = 0;
      for (const e of r.log) {
        expect(e.hour).toBeDefined();
        expect(e.hour!).toBeGreaterThanOrEqual(last);
        last = e.hour!;
      }
      expect(r.hours).toBeGreaterThanOrEqual(last);
      expect(r.days).toBe(tripDays(time.startHour, r.hours!));
    }
  });

  it("charges the stairs, the rooms and the night at the rest spot", () => {
    const r = runExpedition(ix, tough(), orders({ targetFloor: 1 }), 3);
    const floor = r.log.find((e) => e.kind === "floor")!;
    expect(floor.hour).toBe(time.stairs);
    const rooms = r.log.filter((e) => e.kind === "room");
    const restAt = r.log.findIndex((e) => e.kind === "rest");
    const before = r.log
      .slice(0, restAt)
      .filter((e) => e.kind === "room")
      .at(-1)!;
    const after = rooms[rooms.indexOf(before) + 1]!;
    // Walking the rest spot plus a night's sleep, at least.
    expect(after.hour! - before.hour!).toBeGreaterThanOrEqual(time.room + time.behaviours.rest!);
  });

  it("makes camp when the party has been awake too long", () => {
    let camps = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(ix, tough(seed), orders({ targetFloor: 5 }), seed);
      const camp = r.log.filter((e) => e.kind === "camp");
      camps += camp.length;
      for (const c of camp) {
        const next = r.log[r.log.indexOf(c) + 1];
        if (next) expect(next.hour! - c.hour!).toBeGreaterThanOrEqual(time.campHours);
      }
    }
    expect(camps).toBeGreaterThan(0);
  });

  it("is a separate thing from the dice: the clock doesn't change what happens", () => {
    const slow = { ...library, time: { ...time, room: 5, campHours: 1, awakeHours: 1000 } };
    const a = runExpedition(ix, tough(), orders({ targetFloor: 2 }), 11);
    const b = runExpedition(indexLibrary(slow), tough(), orders({ targetFloor: 2 }), 11);
    expect(b.log.map((e) => e.text)).toEqual(a.log.map((e) => e.text));
    expect(b.hours!).toBeGreaterThan(a.hours!);
  });

  it("is tuned so a floor still takes about a day there and back (as before the clock)", () => {
    for (const targetFloor of [1, 2, 3, 4, 5]) {
      let days = 0;
      let n = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const r = runExpedition(ix, tough(seed), orders({ targetFloor }), seed * 31 + targetFloor);
        if (r.outcome !== "returned") continue;
        days += r.days;
        n++;
      }
      expect(n).toBeGreaterThan(30);
      expect(days / n).toBeGreaterThan(targetFloor - 0.25);
      expect(days / n).toBeLessThan(targetFloor + 0.25);
    }
  });

  it("is checked by validateLibrary", () => {
    const bad = { ...library, time: { ...time, room: -1, awakeHours: 0 } };
    const errors = validateLibrary(bad);
    expect(errors.some((e) => /time: room/.test(e))).toBe(true);
    expect(errors.some((e) => /awakeHours/.test(e))).toBe(true);
  });
});
