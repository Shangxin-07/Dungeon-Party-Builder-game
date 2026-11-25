/**
 * Seal Stones and the sealing mission (M8.17, DESIGN.md §20): a floor's
 * shards forged into its stone at the Temple or the Black Market, carried
 * down and set on the stairs below that floor against a surge from the floor
 * below, and the stairs shut for good.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { dungeonDay, newDungeon } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, heroSheet, type Hero } from "./hero";
import { chooseClass, gainXp, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { stoneOf } from "./shards";
import {
  assignBench,
  autoStart,
  cantLaunch,
  cantSeal,
  launch,
  newTown,
  queueJob,
  rest,
  setSeal,
  setStone,
  type TownState,
} from "./town";
import { benches } from "./town/workshops";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const STONE = "seal-stone-diggings-cleansed";

/** A party of four at this level, healed up. */
function party(level: number, seed: number): Hero[] {
  const rng = createRng(seed);
  const heroes = createStarterParty(ix, heroNames, rng, ["fighter", "fighter", "cleric", "mage"]);
  for (const h of heroes) {
    gainXp(ix, h, xpForLevel(ix, level) - h.xp, rng);
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
}

const setting: StandingOrders = { ...DEFAULT_ORDERS, targetFloor: 1, stone: STONE };

describe("Seal Stones", () => {
  it("come two ways for every floor with shards, each needing all of that floor's shards", () => {
    for (const set of library.shards)
      for (const way of library.sealing.ways) {
        const id = `seal-stone-${set.id}-${way.id}`;
        expect(stoneOf(ix, id)).toEqual({ set, way });
        const r = ix.recipe(id);
        expect(r.workshop).toBe(way.workshop);
        expect(r.materials[set.item]).toBe(set.shards.length);
      }
    expect(ix.recipe("seal-stone-flooded-shafts-bound").materials["shard-flooded-shafts"]).toBe(6);
    expect(stoneOf(ix, "iron-ore")).toBeUndefined();
  });

  it("are forged at the Temple, or at the Black Market only while an Evil hero is on the books", () => {
    const t = fresh(2);
    const built = { ...t, buildings: { ...t.buildings, temple: 1, "black-market": 1 } };
    expect(benches(ix, built, "temple")).toBe(1);
    const good = { ...built, roster: built.roster.map((h) => ({ ...h, alignment: "good" })) };
    expect(benches(ix, good, "black-market")).toBe(0);
    const evil = {
      ...good,
      roster: good.roster.map((h, i) => (i ? h : { ...h, alignment: "evil" })),
    };
    expect(benches(ix, evil, "black-market")).toBe(1);
  });

  it("take a floor's shards and work days at a bench", () => {
    const t = fresh(2);
    let s: TownState = {
      ...t,
      gold: 1000,
      buildings: { ...t.buildings, temple: 1 },
      materials: { ...t.materials, "shard-diggings": 3, "iron-bands": 2, planks: 4 },
    };
    s = queueJob(ix, s, "temple", STONE);
    expect(s.materials["shard-diggings"] ?? 0).toBe(0);
    s = assignBench(ix, s, s.roster[0]!.id, "temple");
    for (let d = 0; d < 30 && !s.materials[STONE]; d++) s = rest(ix, s, heroNames);
    expect(s.materials[STONE]).toBe(1);
  });
});

describe("setting a stone", () => {
  it("fights off a surge from the floor below, then shuts the stairs", () => {
    let set = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runExpedition(ix, party(6, seed), setting, seed, newDungeon(ix).floors);
      const text = r.log.map((e) => e.text).join("\n");
      expect(text).toMatch(/Everything in the Warrens that can climb/);
      if (!r.stoneSet) continue;
      set++;
      expect(r.stoneSet.floor).toBe(1);
      expect(r.haul.some((h) => h.item === STONE)).toBe(false);
      // The surge came from floor 2: that's where its dead come off.
      expect(r.floorKills[2] ?? 0).toBeGreaterThan(0);
    }
    expect(set).toBeGreaterThan(17);
  });

  it("comes home in the packs if the party doesn't get to set it, and lies with them if they fall", () => {
    let home = 0;
    let fell = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = runExpedition(ix, party(1, seed), setting, seed, newDungeon(ix).floors);
      if (r.stoneSet) continue;
      if (r.outcome === "wiped") {
        const left = [...r.leftBehind, ...r.porterHaul].filter((h) => h.item === STONE);
        expect(left).toHaveLength(1);
        expect(left[0]!.keep).toBe(true);
        fell++;
      } else if (r.outcome !== "holed") {
        expect(r.haul.filter((h) => h.item === STONE)).toHaveLength(1);
        home++;
      }
    }
    expect(fell + home).toBeGreaterThan(0);
  });

  it("is only set on the floor it seals", () => {
    const r = runExpedition(
      ix,
      party(6, 1),
      { ...setting, targetFloor: 2 },
      1,
      newDungeon(ix).floors,
    );
    expect(r.stoneSet).toBeUndefined();
    expect(r.log.some((e) => /Seal Stone/.test(e.text))).toBe(false);
  });
});

describe("stairs shut for good", () => {
  it("hold everything below back while the gateway holds (gateways.test.ts has the rest)", () => {
    let d = newDungeon(ix);
    d = {
      ...d,
      stones: { 1: { stone: STONE, day: 0, setting: "shut", strain: 0, level: 1, damaged: false } },
    };
    d.floors[1]!.population = 200;
    for (let i = 0; i < 15; i++) {
      const out = dungeonDay(ix, d);
      expect(out.day.pushedUp[1]).toBe(0);
      expect(out.day.breached).toBeUndefined();
      expect(out.day.broke).toBeUndefined();
      d = out.dungeon;
    }
    const cap = library.floors[1]!.capacity;
    expect(d.floors[1]!.population).toBeLessThanOrEqual(
      Math.floor(cap * library.dungeon.seals.crowding),
    );
    expect(d.stones[1]).toBeTruthy();
  });

  it("are set by a party the town sends, and the town hears of it", () => {
    const t = fresh(3);
    let s: TownState = {
      ...t,
      roster: t.roster.map((h, i) => (i < 4 ? { ...party(6, 3)[i]!, id: h.id, name: h.name } : h)),
      materials: { ...t.materials, [STONE]: 1, planks: 6 },
    };
    s = setSeal(ix, { ...s, orders: { ...s.orders, targetFloor: 1 } }, "plank-barricade");
    s = setStone(ix, s, STONE);
    // A stone replaces the barricade order, and sends the party to its floor.
    expect(s.orders.seal).toBeUndefined();
    expect(s.orders.targetFloor).toBe(1);
    expect(cantLaunch(ix, { ...s, materials: {} })).toMatch(/isn't in the store/);
    expect(cantLaunch(ix, { ...s, orders: { ...s.orders, targetFloor: 2 } })).toMatch(
      /send the party to floor 1/,
    );
    s = { ...s, party: s.roster.slice(0, 4).map((h) => h.id) };
    expect(cantLaunch(ix, s)).toBeUndefined();
    let out = launch(ix, s, heroNames);
    expect(out.materials[STONE] ?? 0).toBe(0);
    // A one-off: the next party isn't sent to set another.
    expect(out.orders.stone).toBeUndefined();
    const result = out.outings[0]!.result;
    while (out.outings.length) out = rest(ix, out, heroNames);
    expect(result.stoneSet).toBeTruthy();
    {
      expect(out.dungeon.stones[1]?.stone).toBe(STONE);
      expect(out.news.some((n) => /Its gateway is Shut/.test(n.text))).toBe(true);
      // M8.19: the valley hears of it.
      expect(out.renown).toBeGreaterThanOrEqual(library.renown.deeds.stone);
      expect(cantSeal(ix, out, { ...out.orders, targetFloor: 1, seal: "plank-barricade" })).toMatch(
        /held by a Seal Stone/,
      );
    }
  });
});
