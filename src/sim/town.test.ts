import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  buy,
  cantLaunch,
  dismiss,
  equip,
  hire,
  launch,
  newTown,
  packItem,
  partySlots,
  rest,
  rosterSize,
  sell,
  sellPrice,
  setOrders,
  toggleParty,
  unequip,
  unpackItem,
  upgrade,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => newTown(ix, heroNames, seed);
const rules = library.town;

/** Pay for an upgrade and skip the builders' wait (tests of what the building does). */
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, t, id);
  const done = Object.fromEntries(u.construction.map((c) => [c.building, c.level]));
  return { ...u, buildings: { ...u.buildings, ...done }, construction: [] };
};

describe("a new town", () => {
  it("starts with the house rules from content", () => {
    const t = fresh();
    expect(t.day).toBe(1);
    expect(t.gold).toBe(rules.startingGold);
    expect(t.roster.map((h) => h.classId)).toEqual(rules.startingRoster);
    expect(t.recruits).toHaveLength(rules.recruitsOnOffer);
    expect(t.stash).toEqual(rules.startingStash);
    expect(partySlots(ix, t)).toBe(3);
    expect(rosterSize(ix, t)).toBe(6);
    expect(t.party).toHaveLength(3);
  });

  it("is deterministic and gives everyone a different name", () => {
    expect(fresh(7)).toEqual(fresh(7));
    const t = fresh(7);
    const names = [...t.roster, ...t.recruits].map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is plain data that survives a JSON round trip", () => {
    const t = launch(ix, fresh(), heroNames);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });
});

describe("town actions", () => {
  it("never change the state passed in", () => {
    const t = fresh();
    const before = JSON.stringify(t);
    hire(ix, t, t.recruits[0]!.id);
    buy(ix, t, "healing-potion");
    dismiss(ix, t, t.roster[0]!.id);
    launch(ix, t, heroNames);
    rest(ix, t, heroNames);
    expect(JSON.stringify(t)).toBe(before);
  });

  it("hire a recruit for gold, up to the roster size", () => {
    let t: TownState = { ...fresh(), gold: 10_000 };
    const recruit = t.recruits[0]!;
    t = hire(ix, t, recruit.id);
    expect(t.roster.map((h) => h.id)).toContain(recruit.id);
    expect(t.gold).toBe(10_000 - rules.hireCost);
    expect(t.recruits.map((h) => h.id)).not.toContain(recruit.id);
    t = hire(ix, t, t.recruits[0]!.id);
    expect(t.roster).toHaveLength(6);
    expect(() => hire(ix, t, t.recruits[0]!.id)).toThrow(/roster is full/);
    expect(() => hire(ix, { ...fresh(), gold: 0 }, fresh().recruits[0]!.id)).toThrow(/gold/);
  });

  it("dismiss a hero and keep their gear", () => {
    const t = fresh();
    const fighter = t.roster[0]!;
    const after = dismiss(ix, t, fighter.id);
    expect(after.roster.map((h) => h.id)).not.toContain(fighter.id);
    expect(after.party).not.toContain(fighter.id);
    for (const id of Object.values(fighter.equipment)) expect(after.stash).toContain(id);
  });

  it("buy and sell at the Market", () => {
    let t = fresh();
    t = buy(ix, t, "healing-potion");
    expect(t.gold).toBe(rules.startingGold - 25);
    expect(t.stash).toContain("healing-potion");
    t = sell(ix, t, "healing-potion");
    expect(t.gold).toBe(rules.startingGold - 25 + sellPrice(ix, ix.item("healing-potion")));
    expect(() => buy(ix, t, "gem")).toThrow(/doesn't sell/);
    expect(() => buy(ix, { ...t, gold: 0 }, "sword")).toThrow(/gold/);
    expect(() => sell(ix, t, "gem")).toThrow(/store room/);
  });

  it("swap gear between heroes and the store room", () => {
    let t = { ...fresh(), gold: 1000 };
    const fighter = t.roster[0]!;
    t = buy(ix, t, "axe");
    t = equip(ix, t, fighter.id, "axe");
    expect(t.roster[0]!.equipment.weapon).toBe("axe");
    expect(t.stash).toContain("sword");
    expect(t.stash).not.toContain("axe");
    t = unequip(ix, t, fighter.id, "weapon");
    expect(t.roster[0]!.equipment.weapon).toBeUndefined();
    expect(t.stash).toContain("axe");
    expect(() => equip(ix, t, fighter.id, "bandages")).toThrow(/worn/);
  });

  it("pack supplies, up to carry slots", () => {
    let t = fresh();
    const scout = t.roster[1]!;
    const before = scout.pack.length;
    t = packItem(ix, t, scout.id, "bandages");
    expect(t.roster[1]!.pack).toHaveLength(before + 1);
    t = unpackItem(ix, t, scout.id, before);
    expect(t.roster[1]!.pack).toHaveLength(before);
    expect(t.stash).toContain("bandages");
    expect(() => packItem(ix, t, scout.id, "sword")).toThrow(/supplies/);
  });

  it("limit the party to the Guild Hall's slots, and upgrading adds one", () => {
    let t = { ...fresh(), gold: 1000 };
    const fourth = t.roster[3]!;
    expect(() => toggleParty(ix, t, fourth.id)).toThrow(/full/);
    t = build(t, "guild-hall");
    expect(t.gold).toBe(700);
    expect(partySlots(ix, t)).toBe(4);
    expect(rosterSize(ix, t)).toBe(8);
    t = toggleParty(ix, t, fourth.id);
    expect(t.party).toHaveLength(4);
    t = build(build({ ...t, gold: 1600 }, "guild-hall"), "guild-hall");
    expect(partySlots(ix, t)).toBe(6);
    expect(rosterSize(ix, t)).toBe(12);
    expect(() => upgrade(ix, t, "guild-hall")).toThrow(/bigger/);
  });
});

describe("launching a party", () => {
  it("needs someone fit to go", () => {
    const t = fresh();
    expect(cantLaunch(ix, t)).toBeUndefined();
    expect(cantLaunch(ix, { ...t, party: [] })).toMatch(/at least one/);
    expect(() => launch(ix, { ...t, party: [] }, heroNames)).toThrow();
  });

  it("runs the trip, sells the haul and moves the clock on", () => {
    const t = fresh(3);
    const after = launch(ix, t, heroNames);
    const trip = after.lastTrip!;
    expect(trip.result.outcome).toBe("returned");
    expect(after.day).toBe(t.day + trip.result.days);
    expect(trip.goldEarned).toBe(trip.result.haul.reduce((s, h) => s + h.value, 0));
    expect(after.gold).toBe(t.gold + trip.goldEarned);
    for (const id of t.party) expect(after.records[id]!.trips).toBe(1);
    const kills = Object.values(trip.kills).reduce((a, b) => a + b, 0);
    expect(kills).toBeGreaterThan(0);
    expect(kills).toBeLessThanOrEqual(trip.result.kills.length);
    expect(after.recruits.map((r) => r.id)).not.toEqual(t.recruits.map((r) => r.id));
  });

  it("is deterministic", () => {
    expect(launch(ix, fresh(9), heroNames)).toEqual(launch(ix, fresh(9), heroNames));
  });

  it("loses the whole party on a wipe: some dead, some trapped, and the town carries on", () => {
    let wipe: TownState | undefined;
    for (let seed = 0; seed < 200 && !wipe; seed++) {
      const t = setOrders(ix, fresh(seed), {
        targetFloor: 3,
        retreat: { kind: "never" },
        loot: "everything",
      });
      const after = launch(ix, t, heroNames);
      if (after.lastTrip!.result.outcome === "wiped") wipe = after;
    }
    expect(wipe).toBeDefined();
    const sent = wipe!.lastTrip!.party.map((h) => h.id);
    for (const id of sent) expect(wipe!.roster.map((h) => h.id)).not.toContain(id);
    const trapped = wipe!.sites.flatMap((s) => s.trapped.map((x) => x.hero.id));
    // Each is dead, or trapped, unless they died waiting during the trip home.
    expect(wipe!.memorial.length + trapped.length).toBe(sent.length);
    expect(wipe!.party).toEqual([]);
    expect(wipe!.roster).toHaveLength(1);
    expect(wipe!.lastTrip!.goldEarned).toBe(0);
  });

  it("rest heals the wounded", () => {
    const t = fresh();
    const hurt: TownState = structuredClone(t);
    hurt.roster[0]!.hp = 1;
    hurt.roster[1]!.hp = 0;
    hurt.roster[1]!.condition = "downed";
    expect(cantLaunch(ix, hurt)).toMatch(/rest/);
    const rested = rest(ix, hurt, heroNames);
    expect(rested.day).toBe(2);
    expect(rested.roster[0]!.hp).toBeGreaterThan(1);
    expect(rested.roster[1]!.condition).toBe("ok");
    expect(rested.roster[1]!.hp).toBeGreaterThan(0);
  });
});
