import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "../sim/library";
import { autoStart, newTown, type TownState } from "../sim/town";
import { FOLD_TAB, foldTab, needsByTab, needsYou, TABS } from "./town/needs";

const ix = indexLibrary(library);
const fresh = (): TownState => autoStart(ix, newTown(ix, heroNames, 1));

describe("the town tabs and the needs-you list", () => {
  it("puts every panel on a real tab, and the posts with the parties only at the camp", () => {
    const ids = new Set(TABS.map((t) => t.id));
    for (const tab of Object.values(FOLD_TAB)) expect(ids.has(tab)).toBe(true);
    const camp = newTown(ix, heroNames, 1, { camp: true });
    expect(foldTab(camp, "posts")).toBe("parties");
    expect(foldTab(fresh(), "posts")).toBe("pit");
  });

  it("lists what waits on the player and counts it on the panel's tab", () => {
    let t = fresh();
    const hero = t.roster[0]!;
    t = {
      ...t,
      damaged: ["tavern"],
      roster: t.roster.map((h, i) =>
        i === 0 ? { ...h, morale: 5, raiseAsk: { amount: 1, day: t.day } } : h,
      ),
    };
    const needs = needsYou(ix, t);
    const keys = needs.map((n) => n.key);
    expect(keys).toContain("unhappy");
    expect(keys).toContain("raises");
    expect(keys).toContain("damaged");
    const raise = needs.find((n) => n.key === "raises")!;
    expect(raise.text).toContain(hero.name);
    expect(raise.target).toBe(`hero-card-${hero.id}`);
    const counts = needsByTab(t, needs);
    expect(counts.guild).toBe(3);
    expect(counts.town).toBeUndefined();
  });

  it("has nothing to say about a quiet town", () => {
    expect(needsYou(ix, fresh())).toEqual([]);
  });
});
