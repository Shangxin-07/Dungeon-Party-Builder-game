import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { FloorDef, Library, RoomDef } from "../content/types";
import { DEFAULT_ORDERS, planFloor, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, heroSheet, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { appraise } from "./loot";
import { createRng } from "./rng";

const ix = indexLibrary(library);
const party = (seed = 1) => createStarterParty(ix, heroNames, createRng(seed));
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({ ...DEFAULT_ORDERS, ...o });

/** A one-floor dungeon made only of the given rooms, for testing one behaviour at a time. */
function onlyRooms(rooms: RoomDef[], count = 4): Library {
  const floor: FloorDef = {
    id: "test-floor",
    depth: 1,
    name: "Test Floor",
    rooms: [count, count],
    capacity: 20,
    startPopulation: 10,
  };
  return { ...library, rooms, floors: [floor] };
}
const room = (r: Partial<RoomDef> & Pick<RoomDef, "id" | "behaviour">): RoomDef => ({
  name: r.id,
  floors: [1, 1],
  weight: 1,
  descriptions: ["A test room."],
  ...r,
});

describe("expeditions", () => {
  it("are deterministic: same seed, party and orders give the same trip", () => {
    const a = runExpedition(ix, party(), orders({ targetFloor: 3 }), 42);
    const b = runExpedition(ix, party(), orders({ targetFloor: 3 }), 42);
    expect(b).toEqual(a);
    const c = runExpedition(ix, party(), orders({ targetFloor: 3 }), 43);
    expect(c.log).not.toEqual(a.log);
  });

  it("don't change the heroes passed in", () => {
    const heroes = party();
    const before = JSON.stringify(heroes);
    runExpedition(ix, heroes, orders({ targetFloor: 3, retreat: { kind: "never" } }), 5);
    expect(JSON.stringify(heroes)).toBe(before);
  });

  it("go down floor by floor and come home", () => {
    const r = runExpedition(ix, party(), orders({ targetFloor: 2, retreat: { kind: "never" } }), 3);
    expect(r.outcome).toBe("returned");
    expect(r.deepestFloor).toBe(2);
    expect(r.days).toBe(2);
    expect(r.log.filter((e) => e.kind === "floor").map((e) => e.floor)).toEqual([1, 2]);
    expect(r.log.at(-1)!.kind).toBe("home");
    expect(r.haul.length).toBeGreaterThan(0);
  });

  it("put each floor's fixed rooms somewhere in the middle", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rooms = planFloor(ix, 1, createRng(seed));
      const at = rooms.indexOf("rest-spot");
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(rooms.length - 1);
    }
  });

  it("follow the retreat rule", () => {
    const careful = orders({ targetFloor: 3, retreat: { kind: "hero-hp-below", percent: 90 } });
    let retreats = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runExpedition(ix, party(seed), careful, seed);
      if (r.outcome === "retreated") {
        retreats++;
        expect(r.log.some((e) => e.kind === "retreat" && e.text.includes("turns back"))).toBe(true);
      }
    }
    expect(retreats).toBeGreaterThan(10);
  });

  it("leave the party and its haul where it fell on a wipe", () => {
    const doomed = party().map((h): Hero => ({ ...h, hp: 1 }));
    const lib = onlyRooms([room({ id: "lair", behaviour: "fight" })]);
    const r = runExpedition(indexLibrary(lib), doomed, orders({ retreat: { kind: "never" } }), 1);
    expect(r.outcome).toBe("wiped");
    expect(r.haul).toEqual([]);
    expect(r.wipeSite).toEqual({ floor: 1, room: expect.any(Number) });
    expect(r.party.every((h) => h.condition !== "ok")).toBe(true);
  });
});

describe("rooms", () => {
  it("rest spots heal more with better Medicine", () => {
    const nook = room({ id: "nook", behaviour: "rest", rest: { hpPercent: 50, manaPercent: 50 } });
    const lib = onlyRooms([nook], 1);
    const lix = indexLibrary(lib);
    const healed = (medicineBonus: number) => {
      const heroes = party().map((h): Hero => ({ ...h, hp: 5, pack: [] }));
      // A perk-free way to change Medicine: bump INT and WIL on everyone.
      const mind = 1 + medicineBonus;
      for (const h of heroes) h.stats = { ...h.stats, INT: mind, WIL: mind };
      const r = runExpedition(lix, heroes, orders({ retreat: { kind: "never" } }), 1);
      return r.party.reduce((s, h) => s + h.hp, 0);
    };
    expect(healed(15)).toBeGreaterThan(healed(0));
  });

  it("traps hurt the party unless a scout spots them", () => {
    const trap = (hidden: number) =>
      room({
        id: "darts",
        behaviour: "trap",
        trap: {
          springs: "Darts",
          spotted: "darts",
          hidden,
          damage: [5, 5],
          damageType: "piercing",
          hits: "all",
        },
      });
    const run = (hidden: number) => {
      const lix = indexLibrary(onlyRooms([trap(hidden)], 10));
      return runExpedition(lix, party(), orders({ retreat: { kind: "never" } }), 1).log;
    };
    // Even the best scout misses one in twenty.
    expect(run(-1000).filter((e) => e.kind === "scout").length).toBeGreaterThanOrEqual(7);
    const hidden = run(1000);
    expect(hidden.filter((e) => e.kind === "scout").length).toBeLessThanOrEqual(3);
    expect(hidden.filter((e) => e.kind === "trap").length).toBeGreaterThanOrEqual(20);
  });

  it("a downed hero is carried, and takes up carry slots", () => {
    const lib = onlyRooms([room({ id: "quiet", behaviour: "quiet" })], 1);
    const heroes = party();
    heroes[0] = { ...heroes[0]!, hp: 0, condition: "downed" };
    // Nobody can get them up: no one has any Medicine.
    for (const h of heroes) h.stats = { ...h.stats, INT: 1, WIL: 1 };
    const r = runExpedition(indexLibrary(lib), heroes, orders({ retreat: { kind: "never" } }), 2);
    const downed = r.party[0]!;
    if (downed.condition === "downed") {
      expect(r.log.some((e) => e.text.includes("carried"))).toBe(true);
    }
    expect(r.outcome).toBe("returned");
  });
});

describe("loot and appraisal", () => {
  it("good appraisers guess closer to the real value", () => {
    const rng = createRng(9);
    const err = (skill: number) => {
      let total = 0;
      for (let i = 0; i < 500; i++) total += Math.abs(appraise(100, skill, rng) - 100);
      return total / 500;
    };
    expect(err(100)).toBe(0);
    expect(err(80)).toBeLessThan(err(20));
  });

  it("full packs leave behind what looks least valuable", () => {
    const chest = room({ id: "hoard", behaviour: "treasure", loot: "rich-chest" });
    const lix = indexLibrary(onlyRooms([chest], 8));
    // A weakling party with tiny packs.
    const heroes = party().map((h): Hero => ({ ...h, stats: { ...h.stats, STR: 1, END: 1 } }));
    const r = runExpedition(lix, heroes, orders({ retreat: { kind: "never" } }), 4);
    const drops = r.log.filter((e) => e.kind === "drop");
    expect(drops.length).toBeGreaterThan(0);
    const slots = r.party.reduce(
      (s, h) => s + heroSheet(lix, h).derived.carrySlots - h.pack.length,
      0,
    );
    const load = r.haul.reduce((s, h) => s + (lix.item(h.item).size ?? 1), 0);
    expect(load).toBeLessThanOrEqual(slots);
  });

  it('the "valuable" loot rule leaves the junk', () => {
    const chest = room({ id: "junk", behaviour: "treasure", loot: "junk-pile" });
    const lib: Library = {
      ...onlyRooms([chest], 3),
      lootTables: [
        ...library.lootTables,
        { id: "junk-pile", rolls: [2, 2], entries: [{ item: "rusty-helmet", weight: 1 }] },
      ],
    };
    const lix = indexLibrary(lib);
    const trip = (loot: StandingOrders["loot"]) =>
      runExpedition(lix, party(), orders({ loot, retreat: { kind: "never" } }), 1);
    const picky = trip("valuable");
    const greedy = trip("everything");
    expect(picky.haul).toEqual([]);
    expect(greedy.haul.length).toBe(6);
  });
});
