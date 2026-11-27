/**
 * Act Two (M8.36, DESIGN.md §21): the floors under the heart open once it's
 * shut, and the new bottom floor breeds in its place.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { addNewFloors, dungeonDay, floorsOpen, newDungeon, spawnRate } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition } from "./expedition";
import { createStarterParty, heroSheet } from "./hero";
import { chooseClass, gainXp, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { exportSave, importSave } from "./save";
import { autoStart, newTown, openShards, shardProgress, type TownState } from "./town";
import { coreNews } from "./town/core";

const ix = indexLibrary(library);
const shutHeart = { hearthstone: { reached: 1, shut: { day: 1, by: "x" } } };

describe("Act Two", () => {
  it("keeps the floors under the heart closed until it's shut", () => {
    expect(floorsOpen(ix, 1).map((f) => f.depth)).toEqual([1, 2, 3, 4, 5]);
    expect(floorsOpen(ix, 2).map((f) => f.depth)).toContain(6);
    const d = newDungeon(ix);
    expect(d.floors).toHaveLength(ix.lib.hearts[0]!.floor);
    expect(addNewFloors(ix, d)).toBe(false);
  });

  it("opens the Keepers' Stair when the heart is shut, with news and a page", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const o = {
      id: "o1",
      name: "Brannoc's party",
      left: t.day - 3,
      result: { core: { heart: "hearthstone", day: 2, shut: true } },
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
    const quiet = { ...newDungeon(ix), hearts: shutHeart, days: 200 };
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
    const shut = { ...t, dungeon: { ...t.dungeon, hearts: shutHeart } };
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
    const opened = { ...structuredClone(d), hearts: shutHeart };
    addNewFloors(ix, opened);
    expect(floorsSeen(opened.floors)).toContain(6);
  });

  it("keeps floor 5's shards (the Coalstone's) hidden until there are stairs below it", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const isOldDelve = (id: string) => id.startsWith("old-delve-");
    expect(openShards(ix, t).some(isOldDelve)).toBe(false);
    expect(shardProgress(ix, t).map((p) => p.set.floor)).not.toContain(5);
    const opened: TownState = structuredClone({ ...t, dungeon: { ...t.dungeon, hearts: shutHeart } });
    addNewFloors(ix, opened.dungeon);
    expect(openShards(ix, opened).filter(isOldDelve).sort()).toEqual([
      "old-delve-cache",
      "old-delve-mother",
      "old-delve-step",
      "old-delve-warden",
    ]);
    expect(shardProgress(ix, opened).find((p) => p.set.floor === 5)?.need).toBe(6);
  });

  it("lets a seasoned party take the Vein Mother's shard: a shard of the Coalstone", () => {
    const party = (seed: number) => {
      const rng = createRng(seed);
      const heroes = createStarterParty(ix, heroNames, rng, [
        "fighter",
        "fighter",
        "cleric",
        "mage",
      ]);
      for (const h of heroes) {
        gainXp(ix, h, xpForLevel(ix, 10) - h.xp, rng);
        while (h.levelUps.length) {
          const up = h.levelUps[0]!;
          if (!up.classId) chooseClass(ix, h, h.classId, rng);
          spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, rng);
        }
        const sheet = heroSheet(ix, h);
        h.hp = sheet.derived.maxHp;
        h.mana = sheet.derived.mana;
      }
      return heroes;
    };
    const d = { ...newDungeon(ix), hearts: shutHeart };
    addNewFloors(ix, d);
    const floors = d.floors.map((f) => ({ ...f }));
    floors[4]!.population = 15;
    const hunt = { ...DEFAULT_ORDERS, targetFloor: 5, clearPercent: 100 };
    let taken = 0;
    for (let seed = 1; seed <= 30 && !taken; seed++) {
      const r = runExpedition(ix, party(seed), hunt, seed, floors, {
        shards: ["old-delve-mother"],
      });
      if (!r.shards?.includes("old-delve-mother")) continue;
      taken++;
      const text = r.log.filter((e) => e.kind === "shard").map((e) => e.text);
      expect(text.join("\n")).toMatch(/pries a shard of the Coalstone/);
      expect([...r.haul, ...r.leftBehind].some((h) => h.item === "shard-old-delve")).toBe(true);
    }
    expect(taken).toBe(1);
  });
});
