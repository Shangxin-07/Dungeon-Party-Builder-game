/**
 * M6: reasons to change the party. Floors that suit different parties (and
 * the scouting report that says so), veterans asking for raises, and Glory
 * heroes who sulk on the bench.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { floorOdds } from "./encounter";
import { createHero, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { scoutingReport } from "./report";
import { createRng } from "./rng";
import { answerRaise, launch, newTown, rest, wage, type TownState } from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => newTown(ix, heroNames, seed);
const hero = (classId: string, over: Partial<Hero> = {}): Hero => ({
  ...createHero(ix, { id: `x-${classId}`, name: classId, classId }, createRng(3)),
  ...over,
});
/** A town whose guild has met every monster. */
const veteran = (): TownState => {
  const t = fresh();
  const seen = library.monsters.map((m) => m.id);
  return { ...t, records: { ...t.records, old: { ...t.records[t.roster[0]!.id]!, seen } } };
};

describe("floors", () => {
  it("each have their own signature monsters", () => {
    const share = (floor: number, id: string) =>
      floorOdds(ix, floor).find((o) => o.monster === id)?.share ?? 0;
    expect(share(2, "cave-spider")).toBeGreaterThan(share(3, "cave-spider"));
    expect(share(3, "skeleton")).toBeGreaterThan(share(2, "skeleton"));
    expect(share(3, "skeleton")).toBeGreaterThan(0.4);
  });
});

describe("the scouting report", () => {
  it("hides monsters nobody has met", () => {
    const r = scoutingReport(ix, fresh(), 3, []);
    expect(r.monsters.every((m) => !m.known)).toBe(true);
  });

  it("warns a party with no scout about the Warrens' spiders", () => {
    const t = veteran();
    const noScout = [hero("fighter"), hero("cleric"), hero("mage")];
    const withScout = [
      hero("fighter"),
      hero("scout", { stats: { ...hero("scout").stats, DEX: 18, PER: 18 } }),
      hero("mage"),
    ];
    expect(scoutingReport(ix, t, 2, noScout).warnings.join(" ")).toMatch(
      /Cave Spiders lie in wait/,
    );
    expect(scoutingReport(ix, t, 2, withScout).warnings.join(" ")).not.toMatch(/lie in wait/);
  });

  it("warns a party with no crushing or holy damage about the Bone Halls' skeletons", () => {
    const t = veteran();
    const blades = [hero("fighter"), hero("scout"), hero("scout", { id: "s2" })];
    const r = scoutingReport(ix, t, 3, blades);
    expect(r.monsters.find((m) => m.monster === "skeleton")!.weakTo).toEqual(
      expect.arrayContaining(["crushing", "holy"]),
    );
    expect(r.warnings.join(" ")).toMatch(/Skeletons .* nobody brings/);
    const cleric = [hero("fighter"), hero("cleric"), hero("scout")];
    expect(scoutingReport(ix, t, 3, cleric).warnings.join(" ")).not.toMatch(/nobody brings/);
  });
});

describe("raises", () => {
  const r = library.town.raises;
  const at = (t: TownState, level: number): TownState => ({
    ...t,
    roster: t.roster.map((h, i) => (i === 0 ? { ...h, level, motivation: "glory" } : h)),
  });

  it("are asked for every few levels", () => {
    const t = rest(ix, at(fresh(), 1 + r.everyLevels), heroNames);
    expect(t.roster[0]!.raiseAsk).toEqual({ amount: r.amount, day: 1 });
    expect(t.news.at(-1)!.text).toMatch(/asks for a raise/);
    expect(rest(ix, at(fresh(), r.everyLevels), heroNames).roster[0]!.raiseAsk).toBeUndefined();
  });

  it("cost gold a day if agreed, and morale if refused or ignored", () => {
    const t = rest(ix, at(fresh(), 1 + r.everyLevels), heroNames);
    const h = t.roster[0]!;
    const yes = answerRaise(ix, t, h.id, true);
    expect(wage(ix, yes.roster[0]!)).toBe(wage(ix, h) + r.amount);
    expect(yes.roster[0]!.morale).toBeGreaterThan(h.morale);
    const no = answerRaise(ix, t, h.id, false);
    expect(wage(ix, no.roster[0]!)).toBe(wage(ix, h));
    expect(no.roster[0]!.morale).toBeLessThan(h.morale);
    // Settled until they've gained more levels.
    expect(rest(ix, no, heroNames).roster[0]!.raiseAsk).toBeUndefined();
    // Left unanswered, it's a no.
    let waited = t;
    for (let i = 0; i < r.patienceDays; i++) waited = rest(ix, waited, heroNames);
    expect(waited.roster[0]!.raiseAsk).toBeUndefined();
    expect(waited.roster[0]!.moraleLog.some((n) => n.reason === "was refused a raise")).toBe(true);
  });
});

describe("the bench", () => {
  it("upsets a Glory hero who was fit to go", () => {
    const t = fresh();
    const benched = t.roster.find((h) => !t.party.includes(h.id))!;
    const glory = {
      ...t,
      roster: t.roster.map((h) => (h.id === benched.id ? { ...h, motivation: "glory" } : h)),
    };
    const after = launch(ix, glory, heroNames);
    const h = after.roster.find((x) => x.id === benched.id)!;
    expect(h.moraleLog.some((n) => n.reason === "left behind while others went down")).toBe(true);
  });
});
