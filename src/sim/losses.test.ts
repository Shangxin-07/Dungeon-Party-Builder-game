/**
 * M7.06, losses that sting (DESIGN.md §17.6): with bigger parties the usual
 * bad outcome is losing someone, not everyone. Monsters pick on thin armour,
 * the "badly hurt" order weighs the whole party, and the gear check says who
 * is under-geared before the party goes down.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { expeditionReport } from "./balance";
import { runCombat } from "./combat";
import { runExpedition } from "./expedition";
import { createHero, createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { gearCheck } from "./report";
import { createRng } from "./rng";

const ix = indexLibrary(library);
const hero = (classId: string, over: Partial<Hero> = {}): Hero => ({
  ...createHero(ix, { id: `x-${classId}`, name: classId, classId }, createRng(3)),
  ...over,
});

describe("monsters", () => {
  it("pick on the thinnest armour in reach", () => {
    const fighter = hero("fighter"); // chainmail and a shield
    const cleric = hero("cleric", { row: "front" }); // leather and a shield
    let atFighter = 0;
    let atCleric = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = runCombat(ix, [fighter, cleric], ["skeleton", "skeleton"], { seed });
      const foes = new Set(r.fighters.filter((f) => f.side === "monsters").map((f) => f.uid));
      for (const e of r.log) {
        if ((e.kind !== "hit" && e.kind !== "miss") || !foes.has(e.actor ?? "")) continue;
        if (e.target === fighter.id) atFighter++;
        if (e.target === cleric.id) atCleric++;
      }
    }
    expect(atCleric).toBeGreaterThan(atFighter * 2);
  });
});

describe("the badly hurt order", () => {
  it("doesn't send everyone home because one hero is down", () => {
    let pressedOn = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const party = createStarterParty(ix, heroNames, createRng(seed), [
        "fighter",
        "cleric",
        "scout",
        "mage",
      ]);
      party[3] = { ...party[3]!, hp: 0, condition: "downed" };
      const orders = {
        targetFloor: 2,
        retreat: { kind: "hero-hp-below", percent: 30 },
        loot: "everything",
      } as const;
      const r = runExpedition(ix, party, orders, seed);
      if (r.log.some((e) => e.kind === "floor" && e.text.startsWith("Floor 2"))) pressedOn++;
    }
    expect(pressedOn).toBeGreaterThanOrEqual(10);
  });
});

describe("the gear check", () => {
  it("warns about thin armour in the front row on a deep floor, not on floor 1", () => {
    const cleric = hero("cleric", { row: "front" });
    expect(gearCheck(ix, 1, [cleric])).toEqual([]);
    const deep = gearCheck(ix, 3, [cleric]);
    expect(deep.map((g) => g.text).join(" ")).toMatch(/leather armour won't stop much on floor 3/);
  });

  it("leaves a fighter in chainmail alone, and the back row's robes", () => {
    expect(gearCheck(ix, 3, [hero("fighter"), hero("mage")])).toEqual([]);
  });
});

// The targets in DESIGN.md §17.6, loosely, for a fresh party of four.
describe("losses", () => {
  const runs = 150;
  const party = ["fighter", "fighter", "scout", "mage"];
  const trip = (targetFloor: number) =>
    expeditionReport(
      library,
      heroNames,
      { targetFloor, retreat: { kind: "hero-hp-below", percent: 30 }, loot: "everything" },
      runs,
      party,
    );
  const f1 = trip(1);
  const f3 = trip(3);

  it("are rare on the floor a party is ready for", () => {
    expect(f1.heroDeaths).toBeLessThan(0.03);
    expect(f1.wiped).toBeLessThanOrEqual(0.02);
  });

  it("two floors too deep: deaths are common, and often not the whole party", () => {
    expect(f3.heroDeaths).toBeGreaterThan(0.15);
    expect(f3.someLost).toBeGreaterThan(0.15);
  });
});
