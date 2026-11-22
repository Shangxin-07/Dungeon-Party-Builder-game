/**
 * Pay (M7.12, DESIGN.md §18.2): a retainer at home, a share of the haul for
 * those who went, owed shares paid first, and raises for a bigger cut.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  answerRaise,
  autoStart,
  launchAndWait,
  newTown,
  payDay,
  payShares,
  rest,
  retainer,
  retainerBill,
  shareUnits,
  splitShares,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const rules = library.town;

describe("shares", () => {
  it("split the party's cut by shares: porters take less, a bigger cut takes more", () => {
    const [a, b, c] = fresh().roster;
    const porter = { ...c!, porter: { watched: 0, xp: 0 } };
    const greedy = { ...b!, cut: 0.5 };
    const split = splitShares(ix, [a!, greedy, porter], 1000);
    const pot = Math.round((1000 * rules.shares.percent) / 100);
    expect(Object.values(split).reduce((s, n) => s + n, 0)).toBe(pot);
    expect(split[greedy.id]).toBeGreaterThan(split[a!.id]!);
    expect(split[porter.id]).toBeLessThan(split[a!.id]!);
    expect(shareUnits(ix, porter)).toBe(rules.shares.porter);
    expect(splitShares(ix, [a!], 0)).toEqual({ [a!.id]: 0 });
  });

  it("are paid when the party is back, and nothing is drawn while it's away", () => {
    const t = fresh();
    const after = launchAndWait(ix, t, heroNames);
    const trip = after.lastTrip!;
    expect(Object.keys(trip.shares!).sort()).toEqual([...t.party, ...t.porters].sort());
    // Everyone on the roster went, so nobody drew a retainer.
    expect(after.ledger.some((l) => l.kind === "wages")).toBe(false);
  });

  it("the purse can't cover are owed, and paid first thing the next day", () => {
    const t: TownState = { ...fresh(), gold: 5 };
    const h = t.roster[0]!;
    const split = payShares(ix, t, [h], 100);
    const due = split[h.id]!;
    expect(due).toBeGreaterThan(5);
    expect(t.gold).toBe(0);
    expect(h.owed).toBe(due - 5);
    // Short again: they take it badly.
    payDay(ix, t);
    expect(h.moraleLog.some((n) => n.reason === "wasn't paid")).toBe(true);
    t.gold = 100;
    payDay(ix, t);
    expect(h.owed).toBeUndefined();
    expect(t.ledger.find((l) => l.kind === "shares" && l.day === t.day)!.amount).toBe(-due);
  });
});

describe("retainers", () => {
  it("cost a fraction of the old wages, and an idle guild still goes broke", () => {
    let t = fresh();
    const bill = retainerBill(ix, t);
    expect(bill).toBe(t.roster.reduce((s, h) => s + retainer(ix, h), 0));
    expect(bill).toBeGreaterThan(0);
    for (let d = 0; d < 200 && t.gold >= bill; d++) t = rest(ix, t, heroNames);
    expect(t.gold).toBeLessThan(bill);
  });
});

describe("raises (M7.12)", () => {
  const r = rules.raises;
  const at = (t: TownState, motivation: string): TownState => ({
    ...t,
    roster: t.roster.map((h, i) => (i === 0 ? { ...h, level: 1 + r.everyLevels, motivation } : h)),
  });

  it("Gold heroes ask for a bigger cut of the haul instead of a bigger retainer", () => {
    const t = rest(ix, at(fresh(), "gold"), heroNames);
    const h = t.roster[0]!;
    expect(h.raiseAsk).toEqual({ amount: r.share, day: 1, waited: 0, kind: "share" });
    expect(t.news.at(-1)!.text).toMatch(/half a share more of every haul/);
    const yes = answerRaise(ix, t, h.id, true).roster[0]!;
    expect(shareUnits(ix, yes)).toBe(1 + r.share);
    expect(retainer(ix, yes)).toBe(retainer(ix, h));
  });
});
