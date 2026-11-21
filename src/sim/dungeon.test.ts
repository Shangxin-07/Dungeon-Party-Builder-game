import { describe, expect, it } from "vitest";
import { library } from "../content";
import { applyKills, dungeonDay, levelBand, newDungeon, spawnRate } from "./dungeon";
import { levelPower, rollEncounter } from "./encounter";
import { indexLibrary } from "./library";
import { createRng } from "./rng";

const ix = indexLibrary(library);
const rules = library.dungeon;

/** Run `n` days with nobody killing anything. */
function idle(n: number) {
  let d = newDungeon(ix);
  const days = [];
  for (let i = 0; i < n; i++) {
    const next = dungeonDay(ix, d);
    d = next.dungeon;
    days.push(next.day);
  }
  return { dungeon: d, days };
}

describe("the dungeon over time", () => {
  it("starts from the floors' content", () => {
    const d = newDungeon(ix);
    expect(d.floors.map((f) => f.population)).toEqual(library.floors.map((f) => f.startPopulation));
    expect(d.floors.map((f) => f.level)).toEqual(library.floors.map((f) => f.depth));
    expect(spawnRate(ix, d)).toBe(rules.spawnPerDay);
  });

  it("breeds on the bottom floor, faster every day", () => {
    const { days, dungeon } = idle(20);
    expect(days[0]!.spawned).toBe(rules.spawnPerDay);
    expect(spawnRate(ix, dungeon)).toBeCloseTo(rules.spawnPerDay + 20 * rules.spawnGrowthPerDay);
    expect(days.at(-1)!.spawned).toBeGreaterThan(days[0]!.spawned);
  });

  it("pushes the overflow up until it climbs out of the pit, never above capacity", () => {
    const { days, dungeon } = idle(30);
    dungeon.floors.forEach((f, i) =>
      expect(f.population).toBeLessThanOrEqual(library.floors[i]!.capacity),
    );
    expect(days[0]!.strength).toBe(0);
    const firstOut = days.findIndex((d) => d.overflow.count > 0);
    expect(firstOut).toBeGreaterThan(0);
    // Once it starts, the overflow keeps growing with the spawn rate.
    expect(days.at(-1)!.strength).toBeGreaterThan(days[firstOut]!.strength);
    const last = days.at(-1)!;
    expect(last.strength).toBe(Math.round(last.overflow.count * last.overflow.level));
  });

  it("makes the upper floors stronger as the rejects from below move in", () => {
    const { dungeon } = idle(30);
    expect(dungeon.floors[0]!.level).toBeGreaterThan(1.3);
    expect(dungeon.floors[1]!.level).toBeGreaterThan(2);
    // ...but each floor stays weaker than the one below.
    expect(dungeon.floors[0]!.level).toBeLessThan(dungeon.floors[1]!.level);
    expect(dungeon.floors[1]!.level).toBeLessThan(dungeon.floors[2]!.level);
  });

  it("calms down when the population is kept down", () => {
    let d = idle(30).dungeon;
    const before = d.floors[0]!.level;
    for (let i = 0; i < 20; i++) {
      d = applyKills(d, { 1: 40, 2: 50, 3: 60 });
      d = dungeonDay(ix, d).dungeon;
    }
    expect(d.floors[0]!.level).toBeLessThan(before);
    expect(dungeonDay(ix, applyKills(d, { 1: 99, 2: 99, 3: 99 })).day.overflow.count).toBe(0);
  });

  it("never kills below zero, and is deterministic", () => {
    const d = applyKills(newDungeon(ix), { 1: 999 });
    expect(d.floors[0]!.population).toBe(0);
    expect(idle(25)).toEqual(idle(25));
  });

  it("shows a level band around the average", () => {
    expect(levelBand({ population: 10, level: 1.2 })).toEqual([1, 1.7]);
    expect(levelBand({ population: 10, level: 2.5 })).toEqual([2, 3]);
  });
});

describe("encounters on a floor that's getting worse", () => {
  it("are sized like a deeper floor's", () => {
    expect(levelPower(1)).toBe(10);
    expect(levelPower(2)).toBe(13);
    const power = (level: number) => {
      let total = 0;
      for (let s = 0; s < 300; s++) {
        const group = rollEncounter(ix, 1, createRng(s), { level });
        total += group.reduce((p, id) => p + ix.monster(id).power, 0);
      }
      return total / 300;
    };
    expect(power(2.5)).toBeGreaterThan(power(1) * 1.2);
  });

  it("can't have more monsters than are left on the floor", () => {
    for (let s = 0; s < 50; s++) {
      expect(rollEncounter(ix, 2, createRng(s), { level: 3, max: 2 }).length).toBeLessThanOrEqual(
        2,
      );
    }
    expect(rollEncounter(ix, 1, createRng(1), { max: 0 })).toEqual([]);
  });
});
