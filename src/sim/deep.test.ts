/**
 * M6.21: the deep floors (4 and 5), their monsters, and the buildings that go
 * with them (Apothecary, Mine Cage, the Blacksmith's silver).
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { runCombat } from "./combat";
import { addNewFloors, dungeonDay, newDungeon, type DungeonState } from "./dungeon";
import { rollEncounter } from "./encounter";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { autoStart, liftFloors, newTown, rest, shopStock, type TownState } from "./town";

const ix = indexLibrary(library);
const party = (seed = 1) => createStarterParty(ix, heroNames, createRng(seed));
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({
  ...DEFAULT_ORDERS,
  retreat: { kind: "never" },
  ...o,
});
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
/** A party nothing on floors 1-5 can hurt much, for testing the route and not the fighting. */
const tough = (seed = 1): Hero[] =>
  party(seed).map((h) => ({ ...h, stats: { ...h.stats, STR: 30, END: 30, DEX: 30 }, hp: 999 }));

describe("the deep floors", () => {
  it("go down to floor 5", () => {
    expect(library.floors.map((f) => f.depth)).toEqual([1, 2, 3, 4, 5]);
    const r = runExpedition(ix, tough(), orders({ targetFloor: 5 }), 7);
    expect(r.log.filter((e) => e.kind === "floor").map((e) => e.floor)).toEqual([1, 2, 3, 4, 5]);
  });

  it("have their own monsters, and the old floors don't meet them", () => {
    const seen = (floor: number) => {
      const out = new Set<string>();
      const rng = createRng(floor);
      for (let i = 0; i < 300; i++) for (const m of rollEncounter(ix, floor, rng)) out.add(m);
      return out;
    };
    const deep = ["ghoul", "cave-troll", "sporecaller", "lost-delver"];
    for (const m of deep) expect(seen(2).has(m)).toBe(false);
    expect([...seen(4)]).toEqual(expect.arrayContaining(["ghoul", "cave-troll", "sporecaller"]));
    expect([...seen(5)]).toEqual(expect.arrayContaining(["lost-delver", "ghast"]));
    // The Foreman's Shade only leads the dead on the Old Delve.
    expect(seen(4).has("foremans-shade")).toBe(false);
    expect(seen(5).has("foremans-shade")).toBe(true);
  });

  it("leave floors 1-3 at their usual levels while the dungeon breeds", () => {
    let d: DungeonState = newDungeon(ix);
    for (let i = 0; i < 40; i++) d = dungeonDay(ix, d).dungeon;
    const levels = d.floors.map((f) => f.level);
    // Fed from below, floors 3-5 stay at their own depth; floors 1-2 rise
    // with the push-up, as they always did.
    expect(levels.slice(2)).toEqual([3, 4, 5]);
    expect(levels[1]).toBeGreaterThan(2);
  });

  it("are added to a dungeon from an older game, full", () => {
    const d = newDungeon(ix);
    const old: DungeonState = { ...d, floors: d.floors.slice(0, 3) };
    expect(addNewFloors(ix, old)).toBe(true);
    expect(old.floors).toEqual(d.floors);
    expect(addNewFloors(ix, old)).toBe(false);
  });
});

describe("deep monsters", () => {
  it("a cave troll's wounds start to close once it's hurt", () => {
    let healed = false;
    for (let seed = 1; seed <= 20 && !healed; seed++) {
      const r = runCombat(ix, party(seed), ["cave-troll"], { seed, level: 4 });
      healed = r.log.some((e) => e.text.includes("wounds start to close"));
    }
    expect(healed).toBe(true);
  });

  it("a Foreman's Shade calls up a Lost Delver", () => {
    let called = false;
    for (let seed = 1; seed <= 20 && !called; seed++) {
      const r = runCombat(ix, tough(seed), ["foremans-shade"], { seed, level: 5 });
      called = r.log.some((e) => e.text.includes("rings the shift bell"));
    }
    expect(called).toBe(true);
  });
});

describe("the Mine Cage", () => {
  it("carries a party past the top floors, both ways, and saves the days", () => {
    const walk = runExpedition(ix, tough(), orders({ targetFloor: 3 }), 11);
    const ride = runExpedition(ix, tough(), orders({ targetFloor: 3 }), 11, undefined, { lift: 2 });
    expect(walk.days).toBe(3);
    expect(ride.days).toBe(1);
    expect(ride.deepestFloor).toBe(3);
    expect(ride.log.filter((e) => e.kind === "floor").map((e) => e.floor)).toEqual([3]);
    expect(ride.log.some((e) => e.text.includes("rides the cage down past floors 1 to 2"))).toBe(
      true,
    );
    expect(ride.log.filter((e) => e.kind === "wander").every((e) => e.floor === 3)).toBe(true);
  });

  it("never skips the target floor", () => {
    const r = runExpedition(ix, tough(), orders({ targetFloor: 2 }), 11, undefined, { lift: 2 });
    expect(r.log.filter((e) => e.kind === "floor").map((e) => e.floor)).toEqual([2]);
    expect(r.days).toBe(1);
    const one = runExpedition(ix, tough(), orders({ targetFloor: 1 }), 11, undefined, { lift: 2 });
    expect(one.log.filter((e) => e.kind === "floor").map((e) => e.floor)).toEqual([1]);
  });

  it("is a building: level 2 rides past two floors", () => {
    const t: TownState = { ...fresh(), buildings: { ...fresh().buildings, "mine-cage": 2 } };
    expect(liftFloors(ix, fresh())).toBe(0);
    expect(liftFloors(ix, t)).toBe(2);
    expect(liftFloors(ix, { ...t, damaged: ["mine-cage"] })).toBe(0);
  });
});

describe("the Apothecary and the silver forge", () => {
  it("injuries mend faster with an Apothecary", () => {
    const hurt = (t: TownState): TownState => ({
      ...t,
      roster: t.roster.map((h, i) => (i ? h : { ...h, injuries: [{ id: "broken-arm", days: 6 }] })),
    });
    const plain = rest(ix, hurt(fresh()), heroNames);
    expect(plain.roster[0]!.injuries).toEqual([{ id: "broken-arm", days: 5 }]);
    const withApo = hurt({ ...fresh(), buildings: { ...fresh().buildings, apothecary: 2 } });
    expect(rest(ix, withApo, heroNames).roster[0]!.injuries).toEqual([
      { id: "broken-arm", days: 3 },
    ]);
    expect(shopStock(ix, withApo)).toContain("greater-healing-potion");
  });

  it("the Blacksmith's third level sells silver swords", () => {
    const t = fresh();
    expect(shopStock(ix, { ...t, buildings: { ...t.buildings, blacksmith: 2 } })).not.toContain(
      "silver-sword",
    );
    expect(shopStock(ix, { ...t, buildings: { ...t.buildings, blacksmith: 3 } })).toContain(
      "silver-sword",
    );
  });
});
