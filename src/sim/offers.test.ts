/**
 * Town news (M7.17, DESIGN.md §18.1c): caravans, contracts, petitions, visitors.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  autoStart,
  buyFromCaravan,
  cantDeliver,
  cantGrant,
  cantWelcome,
  deliverContract,
  dismissOffer,
  grantPetition,
  newTown,
  rest,
  sellToCaravan,
  takeContract,
  waitUntilBack,
  welcomeVisitor,
  type Offer,
  type TownState,
} from "./town";

const ix = indexLibrary(library);

const town = (seed = 1): TownState => {
  const t = autoStart(ix, newTown(ix, heroNames, seed));
  return { ...t, posts: {}, gold: 300 };
};
/** A town with one offer of this kind waiting. */
const offering = (def: string, extra: Partial<Offer> = {}, t = town()): TownState => ({
  ...t,
  offers: [{ id: "xt", def, day: t.day, until: t.day + 1, ...extra }],
});

describe("town news", () => {
  it("turns up every few days, one at a time, on its own dice", () => {
    let t = town();
    const seen: string[] = [];
    for (let d = 0; d < 40; d++) {
      t = rest(ix, t, heroNames);
      for (const o of t.offers ?? []) if (!seen.includes(o.id)) seen.push(o.id);
      expect((t.offers ?? []).length).toBeLessThanOrEqual(library.offerRules.max);
    }
    expect(seen.length).toBeGreaterThan(4);
    // Offers don't change the town's other dice.
    const a = rest(ix, town(), heroNames);
    const b = rest(ix, { ...town(), offerSeed: 12345 }, heroNames);
    expect(a.seed).toBe(b.seed);
    // None at the camp.
    let camp = newTown(ix, heroNames, 1, { camp: true });
    for (let d = 0; d < 10; d++) camp = rest(ix, camp, heroNames);
    expect(camp.offers ?? []).toEqual([]);
  });

  it("stops the wait when something turns up", () => {
    let t = town();
    for (let d = 0; d < 30 && !(t.offers ?? []).length; d++) {
      const before = t.news.length;
      const next = rest(ix, t, heroNames);
      if ((next.offers ?? []).length) expect(next.news.length).toBeGreaterThan(before);
      t = next;
    }
    expect((t.offers ?? []).length).toBe(1);
    // With nobody away, waiting does nothing; it's for parties below.
    expect(waitUntilBack(ix, t, heroNames)).toBe(t);
  });

  it("caravans buy materials and sell what the Market doesn't, one of each", () => {
    let t = offering("coast-caravan", {}, { ...town(), materials: { "iron-ore": 5 } });
    t = sellToCaravan(ix, t, "xt", "iron-ore", 5);
    expect(t.materials["iron-ore"]).toBeUndefined();
    expect(t.gold).toBe(300 + 45);
    expect(() => sellToCaravan(ix, t, "xt", "timber", 1)).toThrow(/don't want/);
    t = buyFromCaravan(ix, t, "xt", 0);
    expect(t.stash).toContain("greater-healing-potion");
    expect(() => buyFromCaravan(ix, t, "xt", 0)).toThrow(/sold that/);
    // Gone after its days.
    t = rest(ix, rest(ix, t, heroNames), heroNames);
    expect((t.offers ?? []).some((o) => o.id === "xt")).toBe(false);
  });

  it("contracts are taken on, then delivered by the deadline, or missed", () => {
    let t = offering("ore-contract");
    t = takeContract(ix, t, "xt");
    expect(t.offers![0]!.until).toBe(t.day + 9);
    expect(() => dismissOffer(ix, t, "xt")).toThrow(/word/);
    expect(cantDeliver(ix, t, "xt")).toMatch(/short of 6 iron ore/);
    const paid = deliverContract(ix, { ...t, materials: { "iron-ore": 7 } }, "xt");
    expect(paid.gold).toBe(400);
    expect(paid.materials["iron-ore"]).toBe(1);
    expect(paid.offers).toEqual([]);
    // Missed: the last day is news, then it runs out.
    let late: TownState = { ...t, offers: [{ ...t.offers![0]!, until: t.day + 1 }] };
    late = rest(ix, late, heroNames);
    expect(late.news.some((n) => /Last day for/.test(n.text))).toBe(true);
    late = rest(ix, late, heroNames);
    expect(late.news.some((n) => /ran out before it was delivered/.test(n.text))).toBe(true);
    expect((late.offers ?? []).some((o) => o.id === "xt")).toBe(false);
  });

  it("petitions cost gold and do their good", () => {
    const base = town();
    const homes = {
      ...base,
      buildings: { ...base.buildings, cottages: 1, farm: 1 },
      folk: { count: 2, food: 5, jobs: {} },
    };
    let t = grantPetition(ix, offering("dig-a-well", {}, homes), "xt");
    expect(t.folk!.count).toBe(4);
    expect(t.gold).toBe(240);
    expect(cantGrant(ix, offering("dig-a-well", {}, t), "xt")).toMatch(/Cottages are full/);
    t = grantPetition(ix, offering("seed-corn", {}, t), "xt");
    expect(t.folk!.food).toBe(25);
    const before = t.roster[0]!.morale;
    t = grantPetition(ix, offering("harvest-feast", {}, t), "xt");
    expect(t.roster[0]!.morale).toBeGreaterThan(before);
    expect(cantGrant(ix, offering("harvest-feast", {}, { ...t, gold: 5 }), "xt")).toMatch(/gold/);
  });

  it("visitors join, kitted and free, only where their favourite building stands", () => {
    let t = town(4);
    for (let d = 0; d < 200 && !(t.offers ?? []).some((o) => o.hero); d++) {
      t = rest(ix, { ...t, gold: 300, day: Math.max(t.day, 10) }, heroNames);
      t = { ...t, offers: (t.offers ?? []).filter((o) => o.hero) };
    }
    const o = t.offers!.find((x) => x.hero)!;
    const fav = o.hero!.favourite;
    const without = { ...t, buildings: { ...t.buildings, [fav]: 0 } };
    expect(cantWelcome(ix, without, o.id)).toMatch(/would only stay for/);
    const withIt = { ...t, buildings: { ...t.buildings, [fav]: 1 }, damaged: [] };
    const joined = welcomeVisitor(ix, withIt, o.id);
    expect(joined.roster.some((h) => h.id === o.hero!.id)).toBe(true);
    expect(joined.gold).toBe(withIt.gold);
    expect(Object.keys(o.hero!.equipment).length).toBeGreaterThan(0);
  });
});
