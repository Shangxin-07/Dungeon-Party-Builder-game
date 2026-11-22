import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  autoStart,
  buy,
  cantLaunch,
  dismiss,
  equip,
  haggler,
  hire,
  hirePrice,
  kitOut,
  haulPrice,
  launch,
  launchAndWait,
  newTown,
  packItem,
  partyOnFile,
  partySlots,
  pickParty,
  renameParty,
  saveParty,
  sameOrders,
  rest,
  rosterSize,
  sell,
  sellPrice,
  setOrders,
  toggleParty,
  unequip,
  unpackItem,
  upgrade,
  wageBill,
  type TownState,
} from "./town";
import { stocked } from "./stocked";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const rules = library.town;

/** Pay for an upgrade and skip the builders' wait (tests of what the building does). */
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, stocked(t), id);
  const done = Object.fromEntries(u.construction.map((c) => [c.building, c.level]));
  return { ...u, buildings: { ...u.buildings, ...done }, construction: [] };
};

describe("a new town", () => {
  it("starts with the house rules from content", () => {
    const t = fresh();
    expect(t.day).toBe(1);
    expect(t.gold).toBe(rules.startingGold);
    expect(t.roster.map((h) => h.classId)).toEqual(rules.startingRoster);
    expect(t.freeHires).toBe(0);
    expect(partySlots(ix, t)).toBe(4);
    expect(rosterSize(ix, t)).toBe(8);
    expect(t.party).toHaveLength(4);
    // Kitted out from the store room: every hero has a weapon.
    for (const h of t.roster) expect(h.equipment.weapon).toBeDefined();
  });

  it("begins with untrained recruits who sign for free, and a store room of kit", () => {
    const t = newTown(ix, heroNames, 1);
    expect(t.roster).toHaveLength(0);
    expect(t.stash).toEqual(rules.startingStash);
    expect(t.recruits).toHaveLength(rules.startingRecruits);
    expect(t.freeHires).toBe(rules.startingRecruits);
    for (const r of t.recruits) {
      expect(r.untrained).toBe(true);
      expect(Object.values(r.equipment).filter(Boolean)).toHaveLength(0);
      expect(hirePrice(ix, t, r)).toBe(0);
    }
    // The player picks the class.
    const r0 = t.recruits[0]!;
    const after = hire(ix, t, r0.id, "mage");
    const h = after.roster[0]!;
    expect(h.classId).toBe("mage");
    expect(h.untrained).toBeUndefined();
    expect(after.gold).toBe(t.gold);
    expect(after.freeHires).toBe(t.freeHires - 1);
    // Mage training: INT goes up by the mage's (base - 10) offset.
    const off = ix.cls("mage").baseStats!.INT - 10;
    expect(h.stats.INT).toBe(Math.max(1, Math.min(20, r0.stats.INT + off)));
    // Kit comes from the store room.
    const kitted = kitOut(ix, after, h.id, false);
    expect(kitted.roster[0]!.equipment.weapon).toBe("staff");
    expect(kitted.stash).not.toContain("staff");
  });

  it("is deterministic and gives everyone a different name", () => {
    expect(fresh(7)).toEqual(fresh(7));
    const t = fresh(7);
    const names = [...t.roster, ...t.recruits].map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is plain data that survives a JSON round trip", () => {
    const t = launchAndWait(ix, fresh(), heroNames);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });
});

describe("town actions", () => {
  it("never change the state passed in", () => {
    const t = rest(ix, fresh(), heroNames);
    const before = JSON.stringify(t);
    hire(ix, t, t.recruits[0]!.id);
    kitOut(ix, t, t.roster[0]!.id);
    buy(ix, t, "healing-potion");
    dismiss(ix, t, t.roster[0]!.id);
    launchAndWait(ix, t, heroNames);
    rest(ix, t, heroNames);
    expect(JSON.stringify(t)).toBe(before);
  });

  it("hire a recruit for gold, up to the roster size", () => {
    let t: TownState = { ...rest(ix, fresh(), heroNames), gold: 10_000 };
    const recruit = t.recruits[0]!;
    t = hire(ix, t, recruit.id, "scout");
    expect(t.roster.map((h) => h.id)).toContain(recruit.id);
    expect(t.roster.at(-1)!.classId).toBe("scout");
    expect(t.gold).toBe(10_000 - rules.hireCost);
    expect(t.recruits.map((h) => h.id)).not.toContain(recruit.id);
    while (t.roster.length < 8) {
      if (!t.recruits.length) t = rest(ix, t, heroNames);
      t = hire(ix, t, t.recruits[0]!.id);
    }
    if (!t.recruits.length) t = rest(ix, t, heroNames);
    expect(() => hire(ix, t, t.recruits[0]!.id)).toThrow(/roster is full/);
    const later = rest(ix, fresh(), heroNames);
    expect(() => hire(ix, { ...later, gold: 0 }, later.recruits[0]!.id)).toThrow(/gold/);
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
    expect(t.gold).toBe(
      rules.startingGold - 25 + sellPrice(ix, ix.item("healing-potion"), haggler(ix, t).bonus),
    );
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

  it("fill the party up to the Guild Hall's planned size, but never cap it", () => {
    let t = { ...rest(ix, fresh(), heroNames), gold: 1000 };
    t = hire(ix, t, t.recruits[0]!.id, "fighter");
    const fifth = t.roster[4]!;
    // Hired past the planned size, so not added on their own...
    expect(t.party).toHaveLength(4);
    expect(t.party).not.toContain(fifth.id);
    // ...but they can still go (M7.10): command, not the hall, sets the limit.
    const five = toggleParty(ix, t, fifth.id);
    expect(five.party).toHaveLength(5);
    expect(cantLaunch(ix, five)).toBeUndefined();
    t = build(t, "guild-hall");
    expect(t.gold).toBe(1000 - rules.hireCost - 300);
    expect(partySlots(ix, t)).toBe(5);
    expect(rosterSize(ix, t)).toBe(10);
    t = toggleParty(ix, t, fifth.id);
    expect(t.party).toHaveLength(5);
    t = build(build({ ...t, gold: 1600 }, "guild-hall"), "guild-hall");
    expect(partySlots(ix, t)).toBe(8);
    expect(rosterSize(ix, t)).toBe(16);
    // M7.05: a fifth level, for parties of ten.
    t = build({ ...t, gold: 2000 }, "guild-hall");
    expect(partySlots(ix, t)).toBe(10);
    expect(rosterSize(ix, t)).toBe(20);
    expect(() => upgrade(ix, t, "guild-hall")).toThrow(/bigger/);
  });
});

describe("launching a party", () => {
  it("needs someone fit to go", () => {
    const t = fresh();
    expect(cantLaunch(ix, t)).toBeUndefined();
    expect(cantLaunch(ix, { ...t, party: [] })).toMatch(/at least one/);
    expect(() => launchAndWait(ix, { ...t, party: [] }, heroNames)).toThrow();
  });

  it("runs the trip, sells the haul and moves the clock on", () => {
    const t = fresh(3);
    const after = launchAndWait(ix, t, heroNames);
    const trip = after.lastTrip!;
    expect(trip.result.outcome).toBe("returned");
    expect(after.day).toBe(t.day + trip.result.days);
    // Materials go to the guild's store instead of the Market.
    const isMaterial = (id: string) => ix.item(id).slot === "material";
    expect(trip.goldEarned).toBe(
      trip.result.haul
        .filter((h) => !isMaterial(h.item))
        .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggler(ix, t).bonus), 0),
    );
    const found: Record<string, number> = {};
    for (const h of trip.result.haul)
      if (isMaterial(h.item)) found[h.item] = (found[h.item] ?? 0) + 1;
    expect(trip.materials).toEqual(found);
    expect(after.materials).toEqual(found);
    // The Market takes its cut of the loot, and everyone gets paid each day.
    expect(trip.goldEarned).toBeLessThanOrEqual(trip.result.haul.reduce((s, h) => s + h.value, 0));
    const wages = after.ledger.filter((l) => l.kind === "wages").reduce((s, l) => s + l.amount, 0);
    expect(wages).toBe(-wageBill(ix, t) * trip.result.days);
    expect(after.gold).toBe(t.gold + trip.goldEarned + wages);
    for (const id of t.party) expect(after.records[id]!.trips).toBe(1);
    const kills = Object.values(trip.kills).reduce((a, b) => a + b, 0);
    expect(kills).toBeGreaterThan(0);
    expect(kills).toBeLessThanOrEqual(trip.result.kills.length);
    expect(after.recruits.map((r) => r.id)).not.toEqual(t.recruits.map((r) => r.id));
  });

  it("is deterministic", () => {
    expect(launchAndWait(ix, fresh(9), heroNames)).toEqual(launchAndWait(ix, fresh(9), heroNames));
  });

  it("loses the whole party on a wipe, and the town only hears it's lost when it gives up waiting", () => {
    let wipe: TownState | undefined;
    let sent: string[] = [];
    for (let seed = 0; seed < 200 && !wipe; seed++) {
      const t = setOrders(ix, fresh(seed), {
        targetFloor: 3,
        retreat: { kind: "never" },
        loot: "everything",
      });
      const out = launch(ix, t, heroNames).outings[0]!;
      if (out.result.outcome !== "wiped") continue;
      // A deserter who made it home (M7.05) brings the news: not this case.
      if (out.result.deserters?.length) continue;
      wipe = launchAndWait(ix, t, heroNames);
      sent = out.heroes;
      // Nobody came home to say, so it took until the guild gave up waiting.
      expect(wipe.day).toBe(out.expected + library.rescue.giveUpDays);
    }
    expect(wipe).toBeDefined();
    for (const id of sent) expect(wipe!.roster.map((h) => h.id)).not.toContain(id);
    // Nobody knows who's dead and who's trapped: they're all lost.
    const lost = wipe!.memorial.filter((m) => sent.includes(m.heroId!));
    expect(lost.map((m) => m.fate)).toEqual(sent.map(() => "lost"));
    expect(wipe!.news.some((n) => /up for lost/.test(n.text))).toBe(true);
    expect(wipe!.sites.find((s) => s.party)?.unknown).toBe(true);
    expect(wipe!.party).toEqual([]);
    expect(wipe!.roster).toHaveLength(0);
    expect(wipe!.lastTrip).toBeUndefined();
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

describe("parties on file", () => {
  /** A town with all eight roster slots filled, as two parties of four. */
  const eightHeroes = () => {
    let t = { ...fresh(), gold: 1000 };
    while (t.roster.length < 8) {
      if (!t.recruits.length) t = rest(ix, t, heroNames);
      t = hire(ix, t, t.recruits[0]!.id, "fighter");
      t = kitOut(ix, t, t.roster.at(-1)!.id);
    }
    return t;
  };

  it("saves two parties with their orders, and swaps between them", () => {
    let t = eightHeroes();
    const [a, b] = [t.roster.slice(0, 4), t.roster.slice(4, 8)].map((hs) => hs.map((h) => h.id));
    t = saveParty(ix, t, 0);
    expect(t.party).toEqual(a);
    for (const id of t.party) t = toggleParty(ix, t, id);
    for (const id of b!) t = toggleParty(ix, t, id);
    t = setOrders(ix, t, { ...t.orders, targetFloor: 2 });
    t = renameParty(ix, saveParty(ix, t, 1), 1, "The B team");
    expect(t.parties.map((p) => p.name)).toEqual(["Party A", "The B team"]);

    t = pickParty(ix, t, 0);
    expect(t.party).toEqual(a);
    expect(t.orders.targetFloor).toBe(1);
    t = pickParty(ix, t, 1);
    expect(t.party).toEqual(b);
    expect(t.orders.targetFloor).toBe(2);
    expect(cantLaunch(ix, t)).toBeUndefined();
  });

  it("doesn't hand one party's hunt to the next (Mike's report, M7.10)", () => {
    let t = eightHeroes();
    const b = t.roster.slice(4, 8).map((h) => h.id);
    // Party A clears floor 1; Party B, the new hands, only walk it.
    t = saveParty(ix, setOrders(ix, t, { ...t.orders, clearPercent: 100 }), 0);
    for (const id of t.party) t = toggleParty(ix, t, id);
    for (const id of b) t = toggleParty(ix, t, id);
    t = saveParty(ix, setOrders(ix, t, { ...t.orders, clearPercent: undefined }), 1);
    expect(t.parties[1]!.orders.clearPercent).toBeUndefined();

    // A goes down by hand: picked, then the main send button.
    t = launch(ix, pickParty(ix, t, 0), heroNames);
    expect(t.outings.at(-1)!.result.orders.clearPercent).toBe(100);
    expect(t.orders.clearPercent).toBeUndefined();

    // B put together by hand goes as it is on file, without A's hunt.
    for (const id of b) t = toggleParty(ix, t, id);
    expect(sameOrders(t.parties[1]!.orders, t.orders)).toBe(true);
    const sent = launch(ix, t, heroNames);
    expect(sent.outings.at(-1)!.name).toBe("Party B");
    expect(sent.outings.at(-1)!.result.orders.clearPercent).toBeUndefined();
    // Sent from file, the same.
    const fromFile = launch(ix, pickParty(ix, { ...t, party: [] }, 1), heroNames);
    expect(fromFile.outings.at(-1)!.result.orders.clearPercent).toBeUndefined();
  });

  it("only has so many slots, and needs someone in the party", () => {
    const t = eightHeroes();
    expect(() => saveParty(ix, t, rules.savedParties)).toThrow(/parties on file/);
    expect(() => saveParty(ix, { ...t, party: [] }, 0)).toThrow(/heroes/);
    expect(() => pickParty(ix, t, 1)).toThrow(/Nothing on file/);
  });

  it("leaves out heroes who are no longer with the guild", () => {
    let t = saveParty(ix, eightHeroes(), 0);
    const gone = t.party[1]!;
    t = dismiss(ix, t, gone);
    expect(partyOnFile(t, 0).heroes.map((h) => h.id)).not.toContain(gone);
    t = pickParty(ix, t, 0);
    expect(t.party).toHaveLength(3);
    expect(t.party).not.toContain(gone);
  });
});
