/**
 * Holding the stairs (M7.16, DESIGN.md §18.3b): seals, barricades, the trip.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import { dungeonDay, newDungeon, sealDays, type DungeonState } from "./dungeon";
import {
  autoStart,
  cantLaunch,
  launch,
  launchAndWait,
  newTown,
  rest,
  saveParty,
  sealsNow,
  setSeal,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const rules = library.dungeon.seals;

/** A dungeon whose floors are all full, with a plank barricade over floor 1's stairs. */
const sealed = (strength = 60): DungeonState => {
  const d = newDungeon(ix);
  return {
    ...d,
    floors: d.floors.map((f, i) => ({ ...f, population: ix.floor(i + 1).capacity })),
    seals: { 1: { barricade: "plank-barricade", strength, max: 60, day: 0 } },
  };
};

const town = (): TownState => {
  const t = autoStart(ix, newTown(ix, heroNames, 3));
  return { ...t, posts: {}, gold: 500, materials: { planks: 20, "iron-bands": 4 } };
};

describe("seals in the dungeon", () => {
  it("hold the floor below back and wear down, faster the fuller it gets", () => {
    let d = sealed();
    const strength: number[] = [];
    let held = 0;
    for (let i = 0; i < 30 && d.seals?.[1]; i++) {
      const r = dungeonDay(ix, d);
      d = r.dungeon;
      if (!d.seals?.[1]) {
        expect(r.day.broke).toEqual([1]);
        // The flood: everything held behind it comes up at once.
        expect(r.day.pushedUp[1]).toBeGreaterThan(10);
        break;
      }
      held++;
      // Nothing comes up those stairs while it holds: floor 1 stays as it was.
      expect(r.day.pushedUp[1]).toBe(0);
      expect(r.day.overflow.count).toBe(0);
      strength.push(d.seals[1]!.strength);
      // Penned in, they turn on each other.
      expect(d.floors[1]!.population).toBeLessThanOrEqual(ix.floor(2).capacity * rules.crowding);
    }
    expect(held).toBeGreaterThan(3);
    const drops = strength.map((s, i) => (i ? strength[i - 1]! - s : 60 - s));
    expect(drops.at(-1)!).toBeGreaterThan(drops[0]!);
  });

  it("only feel what's over capacity below them, plus a little wear", () => {
    const d = sealed();
    d.floors[1]!.population = 10;
    const r = dungeonDay(ix, d);
    expect(r.dungeon.seals![1]!.strength).toBe(60 - rules.wearPerDay);
    expect(sealDays(ix, d, 1)).toBe(Math.ceil(60 / rules.wearPerDay));
  });
});

describe("sealing the stairs", () => {
  it("needs the materials, and stairs below the floor", () => {
    const t = setSeal(ix, town(), "plank-barricade");
    expect(cantLaunch(ix, t)).toBeUndefined();
    expect(cantLaunch(ix, { ...t, materials: { planks: 2 } })).toMatch(/needs 4 planks more/);
    const bottom = { ...t, orders: { ...t.orders, targetFloor: library.floors.length } };
    expect(cantLaunch(ix, bottom)).toMatch(/no stairs below/);
    // Never kept on file: it's a one-off.
    expect(saveParty(ix, t, 0).parties![0]!.orders.seal).toBeUndefined();
  });

  /** The first seed whose party ends up as `want` says. */
  const trip = (want: (t: TownState) => boolean, jumpy = false) => {
    for (let seed = 1; seed < 80; seed++) {
      let t0 = setSeal(ix, { ...town(), seed }, "plank-barricade");
      // Turn back at the first scratch.
      if (jumpy)
        t0 = { ...t0, orders: { ...t0.orders, retreat: { kind: "hero-hp-below", percent: 99 } } };
      const left = launch(ix, t0, heroNames);
      if (want(left)) return { t0, left };
    }
    throw new Error("no seed found");
  };

  it("is built after the floor is walked, and goes up in the dungeon", () => {
    const { left } = trip((t) => !!t.outings[0]!.result.sealed);
    expect(left.materials.planks).toBe(14);
    expect(left.orders.seal).toBeUndefined();
    const r = left.outings[0]!.result;
    expect(r.sealed!.floor).toBe(1);
    expect(r.log.some((e) => e.kind === "seal")).toBe(true);
    let t = left;
    for (let i = 0; i < 10 && t.outings.length; i++) t = rest(ix, t, heroNames);
    expect(t.news.some((n) => /sealed the stairs below floor 1/.test(n.text))).toBe(true);
    const seal = sealsNow(ix, t)[0]!;
    expect(seal).toMatchObject({ floor: 1, name: "Plank barricade" });
    expect(seal.percent).toBeGreaterThan(50);
  });

  it("comes home unbuilt if the party turns back, and the planks with it", () => {
    const { t0 } = trip((t) => {
      const r = t.outings[0]!.result;
      return !r.sealed && r.outcome === "retreated";
    }, true);
    const back = launchAndWait(ix, t0, heroNames);
    expect(back.materials.planks).toBe(20);
    expect(back.news.some((n) => /never got to seal/.test(n.text))).toBe(true);
    expect(back.dungeon.seals).toBeUndefined();
  });

  it("gives news when a seal gives way", () => {
    const t = { ...town(), dungeon: sealed(0.5) };
    const after = rest(ix, t, heroNames);
    expect(after.dungeon.seals).toBeUndefined();
    expect(after.news.some((n) => /has given way/.test(n.text))).toBe(true);
  });
});
