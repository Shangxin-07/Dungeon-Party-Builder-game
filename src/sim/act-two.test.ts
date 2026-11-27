/**
 * Act Two (M8.36, DESIGN.md §21): the floors under the heart open once it's
 * shut, and the new bottom floor breeds in its place.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { addNewFloors, dungeonDay, floorsOpen, newDungeon, spawnRate } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition } from "./expedition";
import { createStarterParty } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { exportSave, importSave } from "./save";
import { autoStart, newTown, type TownState } from "./town";
import { coreNews } from "./town/core";

const ix = indexLibrary(library);
const shutHeart = { reached: 1, shut: { day: 1, by: "x" } };

describe("Act Two", () => {
  it("keeps the floors under the heart closed until it's shut", () => {
    expect(floorsOpen(ix, 1).map((f) => f.depth)).toEqual([1, 2, 3, 4, 5]);
    expect(floorsOpen(ix, 2).map((f) => f.depth)).toContain(6);
    const d = newDungeon(ix);
    expect(d.floors).toHaveLength(ix.lib.core.floor);
    expect(addNewFloors(ix, d)).toBe(false);
  });

  it("opens the Keepers' Stair when the heart is shut, with news and a page", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const o = {
      id: "o1",
      name: "Brannoc's party",
      left: t.day - 3,
      result: { core: { day: 2, shut: true } },
    } as unknown as Parameters<typeof coreNews>[2];
    const s: TownState = structuredClone(t);
    coreNews(ix, s, o);
    expect(s.dungeon.floors).toHaveLength(6);
    expect(s.dungeon.floors[5]!.population).toBe(ix.floor(6).startPopulation);
    expect(s.news.map((n) => n.text).join("\n")).toMatch(/The Keepers' Stair/);
    // The town before is untouched.
    expect(t.dungeon.floors).toHaveLength(5);
  });

  it("breeds again at the new bottom floor, from a fresh start", () => {
    const quiet = { ...newDungeon(ix), core: shutHeart, days: 200 };
    expect(spawnRate(ix, quiet)).toBe(0);
    const opened = structuredClone(quiet);
    addNewFloors(ix, opened);
    // The rate starts over from the day the heart was shut, not from day 200's.
    expect(spawnRate(ix, opened)).toBeGreaterThan(0);
    expect(spawnRate(ix, opened)).toBeLessThan(spawnRate(ix, { ...newDungeon(ix), days: 200 }));
    const next = dungeonDay(ix, opened).dungeon;
    expect(next.floors[5]!.population).toBeGreaterThan(opened.floors[5]!.population);
  });

  it("gives an old save with the heart already shut its new floors on load", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const shut = { ...t, dungeon: { ...t.dungeon, core: shutHeart } };
    const up = importSave(ix, exportSave(shut, new Date(0)));
    expect(up.dungeon.floors).toHaveLength(6);
    expect(importSave(ix, exportSave(t, new Date(0))).dungeon.floors).toHaveLength(5);
  });

  it("lets a party go down to floor 6 once it's open, and not before", () => {
    const heroes = createStarterParty(ix, heroNames, createRng(1)).map((h) => ({
      ...h,
      stats: { ...h.stats, STR: 40, END: 40, DEX: 40 },
      hp: 999,
    }));
    const orders = { ...DEFAULT_ORDERS, retreat: { kind: "never" as const }, targetFloor: 6 };
    const floorsSeen = (floors: ReturnType<typeof newDungeon>["floors"]) =>
      runExpedition(ix, heroes, orders, 3, floors)
        .log.filter((e) => e.kind === "floor")
        .map((e) => e.floor);
    const d = newDungeon(ix);
    expect(Math.max(...floorsSeen(d.floors))).toBe(5);
    const opened = { ...structuredClone(d), core: shutHeart };
    addNewFloors(ix, opened);
    expect(floorsSeen(opened.floors)).toContain(6);
  });
});
