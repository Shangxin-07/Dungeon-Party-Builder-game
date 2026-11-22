/**
 * M6 balance pass: wages, the Market's cut of the haul, morale that settles
 * instead of climbing forever, the guild's books, and the Cleric.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { expeditionReport } from "./balance";
import { createHero } from "./hero";
import { indexLibrary } from "./library";
import { moraleChanges } from "./morale";
import { createRng } from "./rng";
import { migrateTown } from "./save";
import {
  autoStart,
  buy,
  haulPrice,
  launchAndWait,
  newTown,
  rest,
  sell,
  TOWN_VERSION,
  wage,
  wageBill,
  type TownState,
} from "./town";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const w = library.town.wages;

describe("wages", () => {
  it("are paid every day, more for higher levels", () => {
    const t = fresh();
    const h = t.roster[0]!;
    expect(wage(ix, h)).toBe(w.base + w.perLevel * h.level);
    expect(wage(ix, { ...h, level: h.level + 3 })).toBe(wage(ix, h) + 3 * w.perLevel);
    const after = rest(ix, t, heroNames);
    expect(after.gold).toBe(t.gold - wageBill(ix, t));
    expect(after.ledger).toEqual([{ day: t.day, kind: "wages", amount: -wageBill(ix, t) }]);
  });

  it("go unpaid when the gold runs out, and the heroes take it badly", () => {
    const t: TownState = { ...fresh(), gold: 0 };
    const after = rest(ix, t, heroNames);
    expect(after.gold).toBe(0);
    expect(after.news.at(-1)!.text).toMatch(/couldn't pay/);
    for (const h of after.roster) {
      expect(h.moraleLog.some((n) => n.reason === "wasn't paid")).toBe(true);
      if (h.motivation === "gold")
        expect(h.moraleLog.some((n) => n.reason === "won't work for nothing")).toBe(true);
    }
  });
});

describe("the Market", () => {
  it("takes a cut of loot from the haul, but not of coins", () => {
    expect(haulPrice(ix, "coins", 10)).toBe(10);
    expect(haulPrice(ix, "gem", 50)).toBe(Math.floor(50 * library.town.haulRate));
    expect(haulPrice(ix, "rusty-helmet", 1)).toBe(1);
  });

  it("writes every coin in and out in the books", () => {
    let t = fresh();
    t = buy(ix, t, "bandages");
    t = sell(ix, t, "bandages");
    t = launchAndWait(ix, t, heroNames);
    const kinds = new Set(t.ledger.map((l) => l.kind));
    expect(kinds).toEqual(
      new Set(["bought", "sold", "wages", ...(t.lastTrip!.goldEarned ? ["haul"] : [])]),
    );
    const start = fresh().gold;
    expect(t.ledger.reduce((s, l) => s + l.amount, 0)).toBe(t.gold - start);
  });
});

describe("morale", () => {
  const hero = (morale: number) => ({
    ...createHero(ix, { id: "h1", name: "Bram", classId: "fighter" }, createRng(1)),
    morale,
    motivation: "comrades",
  });

  it("good news counts half once a hero is already happy", () => {
    const low = moraleChanges(ix, hero(50), { allHome: 1, levelUp: 1 });
    const high = moraleChanges(ix, hero(90), { allHome: 1, levelUp: 1 });
    const sum = (c: { amount: number }[]) => c.reduce((s, x) => s + x.amount, 0);
    expect(sum(high)).toBeLessThan(sum(low));
    expect(sum(high)).toBeGreaterThan(0);
  });

  it("drifts down after days sitting in town", () => {
    const happy = moraleChanges(ix, hero(85), { restDay: 1 });
    expect(happy).toContainEqual({ amount: -1, reason: "restless after days in town" });
    const calm = moraleChanges(ix, hero(60), { restDay: 1 });
    expect(calm.some((c) => c.amount < 0)).toBe(false);
  });

  it("rules with impossible bounds are caught", () => {
    const errors = validateLibrary({
      ...library,
      morale: {
        ...library.morale,
        rules: [{ fact: "restDay", amount: 1, above: 80, below: 50, reason: "never" }],
      },
    });
    expect(errors).toEqual([expect.stringContaining("can never apply")]);
  });
});

describe("the Cleric", () => {
  it("can stand in for the mage next to a fighter and a scout", () => {
    const orders = { targetFloor: 2, retreat: { kind: "hero-hp-below", percent: 30 } } as const;
    const r = expeditionReport(library, heroNames, { ...orders, loot: "everything" }, 120, [
      "fighter",
      "cleric",
      "scout",
    ]);
    expect(r.returned).toBeGreaterThanOrEqual(0.7);
    expect(r.wiped).toBeLessThanOrEqual(0.1);
  });

  it("turns up among the recruits", () => {
    let t = fresh();
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      t = rest(ix, { ...t, gold: 1000 }, heroNames);
      for (const r of t.recruits) seen.add(r.classId);
    }
    expect(seen).toContain("cleric");
  });
});

describe("saves from before M6", () => {
  it("start the books empty, and play on", () => {
    const t = launchAndWait(ix, fresh(), heroNames);
    const old = JSON.parse(JSON.stringify(t)) as Record<string, unknown>;
    old.version = 4;
    delete old.ledger;
    const up = migrateTown(ix, old)!;
    expect(up.version).toBe(TOWN_VERSION);
    expect(up.ledger).toEqual([]);
    expect(rest(ix, up, heroNames).ledger.length).toBe(1);
  });
});
