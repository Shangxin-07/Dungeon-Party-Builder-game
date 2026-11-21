import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { dungeonDay, type DungeonState } from "./dungeon";
import { indexLibrary } from "./library";
import { exportSave, importSave, migrateTown, summarise } from "./save";
import {
  autoStart,
  builderHands,
  defence,
  forecast,
  launch,
  newTown,
  partySlots,
  repair,
  repairCost,
  rest,
  shopStock,
  TOWN_VERSION,
  underConstruction,
  upgrade,
  type TownState,
  wageBill,
} from "./town";
import { stocked } from "./stocked";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));

/** A dungeon left alone for `n` days: floor 1 is spilling over. */
function neglected(n = 30): DungeonState {
  let d = fresh().dungeon;
  for (let i = 0; i < n; i++) d = dungeonDay(ix, d).dungeon;
  return d;
}
/** Pay for an upgrade and skip the builders' wait (tests of what the building does). */
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, stocked(t), id);
  const done = Object.fromEntries(u.construction.map((c) => [c.building, c.level]));
  return { ...u, buildings: { ...u.buildings, ...done }, construction: [] };
};
const crowded = (t: TownState, n = 30): TownState => ({ ...t, dungeon: neglected(n) });
const allHurt = (t: TownState): TownState => ({
  ...t,
  roster: t.roster.map((h) => ({ ...h, hp: 1 })),
});

describe("nights at the pit", () => {
  it("are quiet while the dungeon has room", () => {
    const t = rest(ix, fresh(), heroNames);
    expect(t.pit).toHaveLength(1);
    expect(t.pit[0]).toMatchObject({ day: 1, climbed: 0, strength: 0, outcome: "held" });
    expect(t.raids).toEqual([]);
    expect(t.dungeon.days).toBe(1);
  });

  it("send the overflow at the town; with nobody fit to fight, it's robbed and damaged", () => {
    const t = rest(ix, allHurt({ ...crowded(fresh()), gold: 500 }), heroNames);
    const night = t.pit.at(-1)!;
    expect(night.strength).toBeGreaterThan(0);
    expect(night.outcome).toBe("unopposed");
    const raid = t.raids.at(-1)!;
    expect(raid.goldStolen).toBe(raid.leftover * library.dungeon.raids.goldPerStrength);
    expect(t.gold).toBe(500 - raid.goldStolen - wageBill(ix, t));
    expect(raid.damaged).toEqual(["market"]);
    expect(t.damaged).toEqual(["market"]);
    // A damaged building stops working until it's repaired. It's never destroyed.
    expect(shopStock(ix, t)).toEqual([]);
    expect(t.buildings.market).toBe(1);
    expect(() => upgrade(ix, t, "market")).toThrow();
    const fixed = repair(ix, t, "market");
    expect(fixed.gold).toBe(t.gold - repairCost(ix, t, "market"));
    expect(shopStock(ix, fixed).length).toBeGreaterThan(0);
    expect(() => repair(ix, fixed, "market")).toThrow(/isn't damaged/);
  });

  it("are fought off by healthy heroes at home, with a fight you can watch", () => {
    const t = rest(ix, crowded(fresh()), heroNames);
    const raid = t.raids.at(-1)!;
    expect(raid.defenders.length).toBeGreaterThan(0);
    expect(raid.raiders.length).toBeGreaterThan(0);
    expect(["repelled", "overrun"]).toContain(raid.outcome);
    expect(raid.log[0]!.kind).toBe("raid");
    expect(raid.log.some((e) => e.kind === "combat")).toBe(true);
    if (raid.outcome === "repelled") expect(raid.goldStolen).toBe(0);
  });

  it("injure defenders but never kill them", () => {
    for (let seed = 1; seed <= 15; seed++) {
      let t = crowded(fresh(seed), 40);
      for (let i = 0; i < 6; i++) t = rest(ix, t, heroNames);
      expect(t.raids.length).toBeGreaterThan(0);
      expect(t.memorial).toEqual([]);
    }
  });

  it("are held back by defences", () => {
    let t = { ...crowded(fresh()), gold: 2000 };
    for (const id of ["palisade", "palisade", "palisade", "gate", "gate", "watchtower"])
      t = build(t, id);
    expect(defence(ix, t)).toBe(20 + 6 + 1);
    t = rest(ix, allHurt(t), heroNames);
    const night = t.pit.at(-1)!;
    expect(night.defence).toBe(27);
    if (night.strength <= 27) expect(night.outcome).toBe("held");
    // The Guild Hall is raid-proof: raids never cost you party slots.
    expect(t.damaged).not.toContain("guild-hall");
  });

  it("are seen coming by a watchtower, exactly", () => {
    let t = { ...crowded(fresh()), gold: 500 };
    expect(forecast(ix, t)).toEqual([]);
    t = build(t, "watchtower");
    const [tomorrow] = forecast(ix, t);
    expect(tomorrow!.day).toBe(t.day);
    const after = rest(ix, t, heroNames);
    expect(after.pit.at(-1)!.strength).toBe(tomorrow!.strength);
  });

  it("happen while a party is away, and only the heroes left behind can defend", () => {
    const t = launch(
      ix,
      crowded({ ...fresh(), orders: { ...fresh().orders, targetFloor: 2 } }),
      heroNames,
    );
    const trip = t.lastTrip!;
    expect(t.pit.length).toBe(trip.result.days);
    for (const raid of trip.raids) {
      for (const h of raid.defenders) expect(trip.party.map((p) => p.id)).not.toContain(h.id);
    }
  });

  it("thin out the dungeon when a party kills monsters", () => {
    const t0 = fresh();
    const t = launch(ix, t0, heroNames);
    const killed = t.lastTrip!.result.floorKills[1] ?? 0;
    expect(killed).toBeGreaterThan(0);
    // The day's push-up may have refilled it a little, but the kills came off first.
    const { dungeon } = dungeonDay(ix, {
      ...t0.dungeon,
      floors: t0.dungeon.floors.map((f, i) =>
        i === 0 ? { ...f, population: f.population - killed } : f,
      ),
    });
    expect(t.dungeon.floors[0]!.population).toBe(dungeon.floors[0]!.population);
  });
});

describe("new buildings", () => {
  it("Tavern brings more recruits, picked from more candidates", () => {
    let t = { ...fresh(), gold: 1000 };
    const base = ix.lib.town.recruitsOnOffer;
    t = rest(ix, build(t, "tavern"), heroNames);
    expect(t.recruits).toHaveLength(base + 1);
    t = rest(ix, build({ ...t, gold: 1000 }, "tavern"), heroNames);
    expect(t.recruits).toHaveLength(base + 2);
  });

  it("Blacksmith sells better gear", () => {
    const t = build({ ...fresh(), gold: 1000 }, "blacksmith");
    expect(shopStock(ix, t)).toContain("iron-sword");
    expect(shopStock(ix, fresh())).not.toContain("iron-sword");
    expect(partySlots(ix, t)).toBe(3);
  });
});

describe("building work", () => {
  it("takes the level's days, and the old level keeps working meanwhile", () => {
    // Nobody at home to lend a hand: just the builders.
    let t: TownState = { ...fresh(), gold: 1000, roster: [], party: [] };
    const days = library.buildings.find((b) => b.id === "guild-hall")!.levels[1]!.days;
    expect(days).toBeGreaterThan(0);
    t = upgrade(ix, t, "guild-hall");
    expect(t.gold).toBe(1000 - 300);
    expect(underConstruction(t, "guild-hall")).toMatchObject({ level: 2, daysLeft: days });
    expect(partySlots(ix, t)).toBe(3);
    expect(() => upgrade(ix, t, "guild-hall")).toThrow(/already/);
    for (let i = 1; i < days; i++) t = rest(ix, t, heroNames);
    expect(t.buildings["guild-hall"]).toBe(1);
    t = rest(ix, t, heroNames);
    expect(t.buildings["guild-hall"]).toBe(2);
    expect(partySlots(ix, t)).toBe(4);
    expect(t.construction).toEqual([]);
  });

  it("goes on while a party is away, and several buildings can go up at once", () => {
    let t = stocked({ ...fresh(), gold: 1000, orders: { ...fresh().orders, targetFloor: 2 } });
    t = upgrade(ix, upgrade(ix, t, "gate"), "palisade");
    expect(t.construction).toHaveLength(2);
    t = launch(ix, t, heroNames);
    const days = t.lastTrip!.result.days;
    expect(t.buildings.gate).toBe(1); // 1 day of work
    expect(t.buildings.palisade).toBe(days >= 2 ? 1 : 0);
  });

  it("goes faster with heroes resting in town, up to the cap", () => {
    const days = library.buildings.find((b) => b.id === "guild-hall")!.levels[1]!.days;
    const base = { ...fresh(), gold: 1000 };
    const timeTo = (t: TownState) => {
      t = upgrade(ix, t, "guild-hall");
      let n = 0;
      while (t.buildings["guild-hall"] === 1) {
        t = rest(ix, t, heroNames);
        n++;
      }
      return n;
    };
    const hands = builderHands(ix, base);
    expect(hands.heroes).toHaveLength(base.roster.length);
    expect(hands.work).toBeGreaterThan(0);
    expect(hands.work).toBeLessThanOrEqual(library.town.helpers.maxPerDay);
    expect(timeTo({ ...base, roster: [], party: [] })).toBe(days);
    const helped = timeTo(base);
    expect(helped).toBeLessThan(days);
    expect(helped).toBeGreaterThanOrEqual(Math.ceil(days / (1 + library.town.helpers.maxPerDay)));
    // Injured heroes rest instead.
    const laidUp = {
      ...base,
      roster: base.roster.map((h) => ({
        ...h,
        injuries: [{ id: library.injuries[0]!.id, days: 9 }],
      })),
    };
    expect(builderHands(ix, laidUp).heroes).toEqual([]);
  });

  it("doesn't defend the night it was paid for", () => {
    let t = { ...crowded(fresh()), gold: 500 };
    t = rest(ix, allHurt(upgrade(ix, t, "gate")), heroNames);
    expect(t.pit.at(-1)!.defence).toBe(0);
    expect(defence(ix, t)).toBe(3);
  });
});

describe("saves", () => {
  it("round-trip through a save file", () => {
    const t = rest(ix, fresh(), heroNames);
    const back = importSave(ix, exportSave(t, new Date(0)));
    expect(back).toEqual(t);
    expect(summarise(t)).toEqual({ day: 2, gold: t.gold, heroes: 4, fallen: 0 });
  });

  it("upgrade an M3 town, keeping its heroes", () => {
    const t = launch(ix, fresh(), heroNames);
    const old = structuredClone(t) as Partial<TownState> & Record<string, unknown>;
    old.version = 1;
    for (const k of ["dungeon", "damaged", "pit", "raids", "construction"]) delete old[k];
    delete (old.lastTrip as Partial<TownState["lastTrip"] & object>).raids;
    const up = migrateTown(ix, JSON.parse(JSON.stringify(old)))!;
    expect(up.version).toBe(TOWN_VERSION);
    expect(up.roster).toEqual(t.roster);
    expect(up.dungeon.floors).toHaveLength(library.floors.length);
    expect(up.lastTrip!.raids).toEqual([]);
    // And it plays on.
    expect(rest(ix, up, heroNames).day).toBe(up.day + 1);
  });

  it("refuse things that aren't saves", () => {
    expect(() => importSave(ix, "nope")).toThrow(/valid JSON/);
    expect(() => importSave(ix, "{}")).toThrow(/isn't a Dungeon Party Builder save/);
    const future = JSON.stringify({
      game: "dungeon-party-builder",
      town: { ...fresh(), version: 99 },
    });
    expect(() => importSave(ix, future)).toThrow(/newer version/);
    expect(migrateTown(ix, null)).toBeUndefined();
  });
});
