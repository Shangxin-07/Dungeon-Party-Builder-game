import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { STATS } from "../content/types";
import { rollRecruit, trainRecruit } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { hire, newTown } from "./town";
import { autoSpend, checkSpend, gatesWaived, openClasses, spent, trainingCost } from "./training";

const ix = indexLibrary(library);
const { points, maxPerStat } = library.town.training;
const flat = { STR: 10, DEX: 10, END: 10, PER: 10, INT: 10, WIL: 10, CHA: 10 };

describe("training points and class gates (M9.10)", () => {
  it("costs the points short of each gate, or Infinity past the per-stat limit", () => {
    expect(trainingCost(ix, flat, "mage")).toBe(4 + 2);
    expect(trainingCost(ix, { ...flat, INT: 13, WIL: 12 }, "mage")).toBe(1);
    expect(trainingCost(ix, { ...flat, INT: 9 }, "mage")).toBe(Infinity);
  });

  it("lets the player place points, within the rules", () => {
    const r = { ...flat, INT: 12, WIL: 11 };
    expect(checkSpend(ix, r, "mage", { INT: 2, WIL: 1, END: 4, CHA: 3 })).toBeUndefined();
    expect(checkSpend(ix, r, "mage", { INT: 1, WIL: 1 })).toMatch(/INT 14/);
    expect(checkSpend(ix, r, "mage", { INT: 5, WIL: 1 })).toMatch(/At most/);
    expect(checkSpend(ix, r, "mage", { INT: 2, WIL: 4, END: 4, CHA: 1 })).toMatch(/Only/);
    expect(checkSpend(ix, r, "mage", { INT: -1 })).toMatch(/negative/);
    expect(checkSpend(ix, { ...flat, STR: 6 }, "fighter", { STR: 4, END: 2 })).toMatch(/gates/);
  });

  it("leaves nobody stuck: with no gate in reach, the nearest class opens anyway", () => {
    const weak = { STR: 8, DEX: 8, END: 8, PER: 8, INT: 8, WIL: 8, CHA: 8 };
    const open = openClasses(ix, weak);
    expect(open).toHaveLength(1);
    expect(gatesWaived(ix, weak, open[0]!)).toBe(true);
    const h = trainRecruit(
      ix,
      { ...rollRecruit(ix, { id: "w", name: "W" }, createRng(1)), stats: weak },
      open[0]!,
    );
    expect(spent(Object.fromEntries(STATS.map((s) => [s, h.stats[s] - weak[s]])))).toBe(points);
  });

  it("places every recruit's points legally, meeting the gates", () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const r = rollRecruit(ix, { id: `r${i}`, name: "R" }, rng);
      const open = openClasses(ix, r.stats);
      expect(open.length).toBeGreaterThan(0);
      expect(open).toContain(r.classId);
      for (const c of open) {
        const spend = autoSpend(ix, r.stats, c);
        expect(checkSpend(ix, r.stats, c, spend)).toBeUndefined();
        expect(spent(spend)).toBeLessThanOrEqual(points);
        for (const s of STATS) expect(spend[s] ?? 0).toBeLessThanOrEqual(maxPerStat);
        const h = trainRecruit(ix, r, c, spend);
        for (const s of STATS) expect(h.stats[s]).toBe(r.stats[s] + (spend[s] ?? 0));
      }
    }
  });

  it("is checked when hiring", () => {
    const t = newTown(ix, heroNames, 1);
    const r = t.recruits[0]!;
    const c = openClasses(ix, r.stats)[0]!;
    const bad = Object.fromEntries(STATS.map((s) => [s, maxPerStat]));
    expect(() => hire(ix, t, r.id, c, bad)).toThrow(/Only|past/);
    const shut = ["fighter", "scout", "mage", "cleric"].find(
      (x) => !openClasses(ix, r.stats).includes(x),
    );
    if (shut) expect(() => hire(ix, t, r.id, shut)).toThrow(/gates/);
    const spend = autoSpend(ix, r.stats, c);
    const h = hire(ix, t, r.id, c, spend).roster.at(-1)!;
    expect(h.classId).toBe(c);
  });
});
