import { describe, expect, it } from "vitest";
import { library } from "../content";
import type { Library } from "../content/types";
import { runCombat } from "./combat";
import { createHero, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";

// Lurking (M9.04, DESIGN.md "Lurking"): rogues in the back row hide, strike
// from the shadows, and risk being found after every strike.

const rat = library.monsters.find((m) => m.id === "giant-rat")!;
const lib = (stealth: Partial<Library["stealth"]>, hearing = 0): Library => ({
  ...library,
  monsters: [...library.monsters, { ...rat, id: "test-rat", hearing }],
  stealth: { ...library.stealth, ...stealth },
});

const scout = (ix: ReturnType<typeof indexLibrary>, row: "front" | "back"): Hero => {
  const h = createHero(ix, { id: "wren", name: "Wren", classId: "scout" }, createRng(1));
  return { ...h, row, equipment: { weapon: "dagger" } };
};

const damageBy = (log: ReturnType<typeof runCombat>["log"], uid: string): number => {
  let cur = "";
  let total = 0;
  for (const e of log) {
    if (e.actor) cur = e.actor;
    if (e.kind === "damage" && cur === uid && e.target?.startsWith("m")) total += e.amount ?? 0;
  }
  return total;
};

describe("lurking in the back row (M9.04)", () => {
  it("a hidden hero can't be singled out, and strikes from the shadows", () => {
    // Deaf rats: always hidden, and never spotted on the first strike.
    const ix = indexLibrary(lib({ min: 0, max: 1 }, -1000));
    const r = runCombat(ix, [scout(ix, "back")], ["test-rat"], { seed: 1 });
    const texts = r.log.map((e) => e.text);
    expect(texts).toContain("Wren slips into the shadows.");
    expect(texts.some((t) => t.includes("(from the shadows!)"))).toBe(true);
    // Until it spots her, the rat has nobody it can go for.
    const firstSpot = r.log.findIndex((e) => e.text.includes("spots Wren"));
    const before = firstSpot < 0 ? r.log : r.log.slice(0, firstSpot);
    expect(before.some((e) => e.kind === "damage" && e.target === "wren")).toBe(false);
    expect(r.winner).toBe("party");
  });

  it("once spotted, the lurker stands in the front row", () => {
    // Always hidden, always spotted at the first strike.
    const ix = indexLibrary(lib({ base: 1, min: 1, max: 1 }));
    const r = runCombat(ix, [scout(ix, "back")], ["test-rat", "test-rat"], { seed: 3 });
    expect(r.log.some((e) => e.text.includes("spots Wren"))).toBe(true);
    expect(r.fighters.find((f) => f.heroId === "wren")).toMatchObject({
      hidden: false,
      row: "front",
      strikesHidden: 1,
    });
  });

  it("a melee blow from the back row by someone not hidden does half damage", () => {
    // Nobody can hide: the back-row dagger does about half what the front-row one does.
    const ix = indexLibrary(lib({ base: 0, min: 0, max: 0 }));
    let back = 0;
    let front = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const tough = ["skeleton"];
      back += damageBy(
        runCombat(ix, [scout(ix, "back")], tough, { seed, maxRounds: 3 }).log,
        "wren",
      );
      front += damageBy(
        runCombat(ix, [scout(ix, "front")], tough, { seed, maxRounds: 3 }).log,
        "wren",
      );
    }
    expect(back / front).toBeGreaterThan(0.35);
    expect(back / front).toBeLessThan(0.7);
  });

  it("bows and reach weapons don't hide and aren't penalised", () => {
    const ix = indexLibrary(lib({ base: 1, min: 1, max: 1 }));
    for (const weapon of ["short-bow", "staff"]) {
      const h = { ...scout(ix, "back"), equipment: { weapon } };
      const r = runCombat(ix, [h], ["test-rat"], { seed: 1 });
      expect(r.log.some((e) => e.text.includes("shadow"))).toBe(false);
    }
  });
});
