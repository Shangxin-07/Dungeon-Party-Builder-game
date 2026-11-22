/**
 * M6: wear and tear (fatigue, injuries) and restocking used supplies.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { fatigueTier, heroSheet, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { migrateTown } from "./save";
import {
  autoStart,
  cantLaunch,
  launchAndWait,
  launchWarnings,
  newTown,
  rest,
  restock,
  restockPlan,
  TOWN_VERSION,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const w = library.wear;
const withHero = (t: TownState, i: number, f: (h: Hero) => Hero): TownState => ({
  ...t,
  roster: t.roster.map((h, n) => (n === i ? f(h) : h)),
});

describe("fatigue", () => {
  it("builds up on a trip and wears off in town", () => {
    const t = launchAndWait(ix, fresh(), heroNames);
    const trip = t.lastTrip!;
    const fights = trip.result.log.filter((e) => e.kind === "fight" && e.monsters).length;
    const gained = w.fatiguePerTripDay * trip.result.days + w.fatiguePerFight * fights;
    for (const id of fresh().party) {
      expect(trip.fatigue![id]).toBe(gained);
      // A night's sleep once they're home.
      expect(t.roster.find((h) => h.id === id)!.fatigue).toBe(Math.max(0, gained - w.restPerDay));
    }
    const later = rest(ix, t, heroNames);
    for (const h of later.roster)
      expect(h.fatigue).toBeLessThanOrEqual(Math.max(0, gained - 2 * w.restPerDay));
  });

  it("makes a tired hero fight worse, and says so before launch", () => {
    const t = fresh();
    const h = t.roster[0]!;
    const tired = { ...h, fatigue: w.tiers[0]!.at };
    expect(fatigueTier(ix, tired)?.name).toBe(w.tiers[0]!.name);
    const before = heroSheet(ix, h).derived;
    const after = heroSheet(ix, tired).derived;
    expect(after.accuracy).toBeLessThan(before.accuracy);
    expect(after.evasion).toBeLessThan(before.evasion);
    const warned = launchWarnings(
      ix,
      withHero(t, 0, () => tired),
    );
    expect(warned.some((x) => x.includes(`${h.name} is ${w.tiers[0]!.name}`))).toBe(true);
  });

  it("costs morale when a worn-out hero is sent down", () => {
    const t = withHero(fresh(), 0, (h) => ({ ...h, fatigue: 80 }));
    const after = launchAndWait(ix, t, heroNames);
    const notes = after.lastTrip!.morale![t.roster[0]!.id] ?? [];
    if (after.roster.some((h) => h.id === t.roster[0]!.id))
      expect(notes.some((n) => n.reason === "was sent down worn out")).toBe(true);
  });
});

describe("injuries", () => {
  it("keep a hero out of the pit, weaken them, and heal a day at a time in town", () => {
    const t = withHero(fresh(), 0, (h) => ({ ...h, injuries: [{ id: "broken-arm", days: 2 }] }));
    const h = t.roster[0]!;
    expect(heroSheet(ix, h).stats.STR).toBe(heroSheet(ix, fresh().roster[0]!).stats.STR - 3);
    // Laid up: they can't go down the pit until it heals.
    const inParty = { ...t, party: [h.id] };
    expect(cantLaunch(ix, inParty)).toMatch(/broken arm for 2 more days/);
    const day1 = rest(ix, t, heroNames);
    expect(day1.roster[0]!.injuries).toEqual([{ id: "broken-arm", days: 1 }]);
    const day2 = rest(ix, day1, heroNames);
    expect(day2.roster[0]!.injuries).toEqual([]);
    expect(day2.news.some((n) => n.text.includes("broken arm has healed"))).toBe(true);
  });

  it("turn up on trips where heroes get knocked about", () => {
    let injured = 0;
    for (let seed = 1; seed <= 40 && !injured; seed++) {
      const t = fresh(seed);
      const after = launchAndWait(ix, { ...t, orders: { ...t.orders, targetFloor: 3 } }, heroNames);
      for (const [id, list] of Object.entries(after.lastTrip?.injuries ?? {})) {
        injured += list.length;
        const h = after.roster.find((x) => x.id === id);
        if (h) expect(h.injuries.map((i) => i.id)).toEqual(expect.arrayContaining(list));
      }
    }
    expect(injured).toBeGreaterThan(0);
  });
});

describe("restocking", () => {
  it("lists what the trip used, from the store room first, and puts it back", () => {
    // Find a trip that used something up.
    for (let seed = 1; seed <= 30; seed++) {
      const t = launchAndWait(
        ix,
        { ...fresh(seed), orders: { ...fresh(seed).orders, targetFloor: 2 } },
        heroNames,
      );
      const plan = restockPlan(ix, t);
      if (!plan.length) continue;
      for (const l of plan) {
        const before = t.lastTrip!.party.find((h) => h.id === l.heroId)!;
        expect(before.pack).toContain(l.item);
        expect(l.from === "store" ? l.cost === 0 : l.cost > 0).toBe(true);
      }
      const fromStore = plan.filter((l) => l.from === "store");
      for (const l of fromStore) expect(t.stash).toContain(l.item);
      const cost = plan.reduce((s, l) => s + l.cost, 0);
      const after = restock(ix, { ...t, gold: cost + 100 }, plan);
      expect(after.gold).toBe(100);
      expect(restockPlan(ix, after)).toEqual([]);
      for (const l of plan)
        expect(after.roster.find((h) => h.id === l.heroId)!.pack).toContain(l.item);
      // Short of gold, nothing is bought.
      const buys = plan.filter((l) => l.cost > 0);
      if (buys.length)
        expect(() => restock(ix, { ...t, gold: 0 }, buys)).toThrow(/Not enough gold/);
      return;
    }
    throw new Error("No trip in 30 used anything up");
  });

  it("has nothing to do before the first trip", () => {
    expect(restockPlan(ix, fresh())).toEqual([]);
  });
});

describe("saves from before wear and tear", () => {
  it("start everyone rested and whole", () => {
    const t = launchAndWait(ix, fresh(), heroNames);
    const old = JSON.parse(JSON.stringify(t)) as Record<string, unknown> & {
      roster: Record<string, unknown>[];
    };
    old.version = 5;
    for (const h of [...old.roster, ...(old.recruits as Record<string, unknown>[])]) {
      delete h.fatigue;
      delete h.injuries;
    }
    const up = migrateTown(ix, old)!;
    expect(up.version).toBe(TOWN_VERSION);
    for (const h of up.roster) {
      expect(h.fatigue).toBe(0);
      expect(h.injuries).toEqual([]);
    }
    expect(launchAndWait(ix, rest(ix, up, heroNames), heroNames).day).toBeGreaterThan(up.day);
  });
});
