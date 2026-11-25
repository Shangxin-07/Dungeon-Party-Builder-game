/**
 * Gateways (M8.18, DESIGN.md §20): a set Seal Stone holds the stairs, and
 * the town sets it to Shut, Trickle or Open. Held back, the floor below
 * strains it; past its limit it breaches and stands open until mended.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { dungeonDay, gatewayLimit, newDungeon, type DungeonState, type StoneSeal } from "./dungeon";
import { indexLibrary } from "./library";
import { importSave, exportSave } from "./save";
import {
  autoStart,
  cantMendGateway,
  cantRaiseGateway,
  gatewaysNow,
  mendGateway,
  newTown,
  raiseGateway,
  rest,
  setGateway,
  TownError,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const STONE = "seal-stone-diggings-cleansed";
const g = library.sealing.gateway;
const cap2 = library.floors[1]!.capacity;
const crowded = Math.floor(cap2 * library.dungeon.seals.crowding);

const gate = (over: Partial<StoneSeal> = {}): StoneSeal => ({
  stone: STONE,
  day: 1,
  setting: "shut",
  strain: 0,
  level: 1,
  damaged: false,
  ...over,
});

/** A dungeon with floor 1's stairs held, and floor 2 packed. */
function held(over: Partial<StoneSeal> = {}): DungeonState {
  const d = newDungeon(ix);
  d.stones = { 1: gate(over) };
  d.floors[1]!.population = crowded;
  return d;
}

function days(d: DungeonState, n: number) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = dungeonDay(ix, d);
    out.push(r.day);
    d = r.dungeon;
  }
  return { d, days: out };
}

function townWith(stone: Partial<StoneSeal>, extra: Partial<TownState> = {}): TownState {
  const t = autoStart(ix, newTown(ix, heroNames, 3));
  return {
    ...t,
    ...extra,
    dungeon: { ...t.dungeon, stones: { 1: gate(stone) } },
  };
}

describe("a gateway set to Shut", () => {
  it("lets nothing up, and strains while the floor below is packed", () => {
    const { d, days: log } = days(held(), 10);
    expect(log.every((x) => x.pushedUp[1] === 0)).toBe(true);
    expect(d.stones[1]!.strain).toBeGreaterThan(5);
    expect(d.floors[1]!.population).toBeLessThanOrEqual(crowded);
  });

  it("eases while the floor below is hunted under its capacity", () => {
    const d = held({ strain: 10 });
    d.floors[1]!.population = 10;
    d.floors[2]!.population = 0;
    const out = dungeonDay(ix, d).dungeon;
    expect(out.stones[1]!.strain).toBe(10 - g.ease);
  });

  it("creaks first, then breaches past its limit: everything comes up and it stands open", () => {
    const limit = gatewayLimit(ix, gate());
    const { d, days: log } = days(held({ strain: limit * g.warnAt - 0.5 }), 40);
    const creak = log.findIndex((x) => x.strained?.includes(1));
    const breach = log.findIndex((x) => x.breached?.includes(1));
    expect(creak).toBeGreaterThanOrEqual(0);
    expect(breach).toBeGreaterThan(creak);
    expect(log[breach]!.pushedUp[1]).toBeGreaterThan(0);
    expect(d.stones[1]!.damaged).toBe(true);
    // Breached, it holds nothing back, but it's still there to mend.
    expect(log.slice(breach + 1).some((x) => x.pushedUp[1]! > 0)).toBe(true);
  });

  it("a higher level holds longer", () => {
    const at = (level: number) =>
      days(held({ level }), 200).days.findIndex((x) => x.breached?.includes(1));
    expect(at(2)).toBeGreaterThan(at(1));
    expect(at(3)).toBeGreaterThan(at(2));
  });
});

describe("a gateway set to Trickle", () => {
  it("lets a few up a day at the level of the floor above, and strains slower", () => {
    const shut = days(held(), 5).d.stones[1]!.strain;
    const { d, days: log } = days(held({ setting: "trickle" }), 5);
    for (const x of log) expect(x.pushedUp[1]).toBe(g.trickle.perDay);
    expect(d.stones[1]!.strain).toBeLessThan(shut);
    // Floor 1 stays about floor 1: they're the weak ones.
    expect(d.floors[0]!.level).toBeLessThan(1.1);
  });

  it("keeps a hunted-out floor above stocked", () => {
    const d = held({ setting: "trickle" });
    d.floors[0]!.population = 0;
    const out = days(d, 4).d;
    expect(out.floors[0]!.population).toBe(4 * g.trickle.perDay);
  });
});

describe("a gateway set to Open", () => {
  it("lets everything up as if it weren't there, and eases", () => {
    const d = held({ setting: "open", strain: 5 });
    const plain = newDungeon(ix);
    plain.floors[1]!.population = crowded;
    const a = dungeonDay(ix, d);
    const b = dungeonDay(ix, plain);
    expect(a.day.pushedUp).toEqual(b.day.pushedUp);
    expect(a.dungeon.floors).toEqual(b.dungeon.floors);
    expect(a.dungeon.stones[1]!.strain).toBe(5 - g.ease);
  });
});

describe("in town", () => {
  it("sets a gateway, and refuses one that isn't there", () => {
    const t = setGateway(ix, townWith({}), 1, "trickle");
    expect(t.dungeon.stones[1]!.setting).toBe("trickle");
    expect(() => setGateway(ix, t, 2, "open")).toThrow(TownError);
  });

  it("raises a gateway for gold and materials", () => {
    const next = g.levels[1]!;
    const poor = townWith({}, { gold: 0, materials: {} });
    expect(cantRaiseGateway(ix, poor, 1)).toMatch(/gold/);
    const rich = townWith({}, { gold: 1000, materials: { ...next.materials } });
    const t = raiseGateway(ix, rich, 1);
    expect(t.dungeon.stones[1]!.level).toBe(2);
    expect(t.gold).toBe(1000 - next.gold!);
    expect(t.materials).toEqual({});
    expect(rich.dungeon.stones[1]!.level).toBe(1);
    const top = townWith({ level: g.levels.length }, { gold: 9999 });
    expect(cantRaiseGateway(ix, top, 1)).toMatch(/strong/);
  });

  it("mends a breached gateway, and only a breached one", () => {
    const cost = g.levels[0]!.repair;
    expect(cantMendGateway(ix, townWith({}, { gold: 999 }), 1)).toMatch(/isn't breached/);
    const t0 = townWith({ damaged: true }, { gold: 999, materials: { ...cost.materials } });
    const t = mendGateway(ix, t0, 1);
    expect(t.dungeon.stones[1]!.damaged).toBe(false);
    expect(t.gold).toBe(999 - cost.gold);
  });

  it("hears when a gateway creaks and when it breaches", () => {
    const limit = gatewayLimit(ix, gate());
    let t = townWith({ strain: limit - 0.1 });
    t.dungeon.floors[1]!.population = crowded;
    t = rest(ix, t, heroNames);
    expect(t.news.some((n) => /has breached/.test(n.text))).toBe(true);
    expect(gatewaysNow(ix, t)[0]).toMatchObject({ floor: 1, damaged: true });
  });

  it("survives a save and load", () => {
    const t = setGateway(ix, townWith({ strain: 4, level: 2 }), 1, "trickle");
    const back = importSave(ix, exportSave(t, new Date(0)));
    expect(back.dungeon.stones[1]).toEqual(t.dungeon.stones[1]);
  });

  it("gives a stone set before gateways (version 20) a Shut level-1 gateway", () => {
    const t = townWith({});
    const old = structuredClone(t) as unknown as Record<string, unknown> & {
      dungeon: { stones: Record<number, Record<string, unknown>> };
    };
    old.version = 20;
    old.dungeon.stones = { 1: { stone: STONE, day: 4, by: "Party A" } };
    const back = importSave(
      ix,
      JSON.stringify({ game: "dungeon-party-builder", version: 20, savedAt: "", town: old }),
    );
    expect(back.dungeon.stones[1]).toEqual({
      stone: STONE,
      day: 4,
      by: "Party A",
      setting: "shut",
      strain: 0,
      level: 1,
      damaged: false,
    });
  });
});
