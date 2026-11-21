/**
 * Freeform classes (DESIGN.md §9): each level goes into a class the player
 * picks, new base classes open at a stat minimum, advanced and combo classes
 * at class levels (plus stats and sometimes a building), and depth pays off.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { knownAbilityIds, upcomingAbilities } from "./abilities";
import { runCombat } from "./combat";
import { classLine, createHero, depthPassives, heroSheet, type Hero } from "./hero";
import {
  badClass,
  chooseClass,
  classOptions,
  gainXp,
  mainClass,
  openClasses,
  perkPool,
  spendLevelUp,
  xpForLevel,
} from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { autoStart, chooseLevelClass, chooseLevelUp, hire, newTown, type TownState } from "./town";

const ix = indexLibrary(library);
const rng = (seed = 1) => createRng(seed);

function hero(classId: string, stats: Partial<Hero["stats"]> = {}): Hero {
  const h = createHero(ix, { id: `h-${classId}`, name: "Test", classId }, rng());
  h.stats = { ...h.stats, ...stats };
  return h;
}

/** Level a hero up `n` times, every level into `classId`, perks and points spent. */
function levelInto(h: Hero, classId: string, n: number, built?: (id: string) => boolean) {
  for (let i = 0; i < n; i++) {
    gainXp(ix, h, xpForLevel(ix, h.level + 1) - h.xp, rng(i), built);
    const up = h.levelUps[0]!;
    if (!up.classId) chooseClass(ix, h, classId, rng(i), built);
    else expect(up.classId).toBe(classId);
    spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, rng(i), built);
  }
}

describe("putting levels into classes", () => {
  it("waits for the player when there's a choice, and the gains come with the choice", () => {
    const h = hero("fighter", { INT: 12 });
    const before = { ...h.stats };
    gainXp(ix, h, xpForLevel(ix, 2), rng());
    expect(h.level).toBe(2);
    expect(h.levelUps[0]!.classId).toBeUndefined();
    expect(h.stats).toEqual(before);
    expect(openClasses(ix, h).map((o) => o.cls.id)).toEqual(
      expect.arrayContaining(["fighter", "mage"]),
    );
    chooseClass(ix, h, "mage", rng());
    expect(h.classes).toEqual({ fighter: 1, mage: 1 });
    expect(h.stats.INT).toBe(before.INT + 1);
    expect(h.stats.STR).toBe(before.STR);
    expect(classLine(ix, h)).toBe("Fighter 1 / Mage 1");
    // Mage 1 brings the Mage's level-1 spells; the perk offers suit a Mage.
    expect(knownAbilityIds(ix, h)).toEqual(expect.arrayContaining(["firebolt", "mend"]));
    for (const p of h.levelUps[0]!.offers) {
      const c = ix.perk(p).classes;
      expect(!c.length || c.includes("mage")).toBe(true);
    }
    expect(() => chooseClass(ix, h, "fighter", rng())).toThrow(/already gone into Mage/);
  });

  it("picks the class for them when only one is open", () => {
    const h = hero("fighter", { DEX: 8, INT: 8, WIL: 8 });
    gainXp(ix, h, xpForLevel(ix, 2), rng());
    expect(h.levelUps[0]!.classId).toBe("fighter");
    expect(h.classes).toEqual({ fighter: 2 });
  });

  it("won't open a class the hero doesn't qualify for, and says what's missing", () => {
    const h = hero("fighter", { INT: 9, DEX: 12 });
    gainXp(ix, h, xpForLevel(ix, 2), rng());
    expect(badClass(ix, h, "mage")).toMatch(/needs INT 12 \(has 9\)/);
    expect(badClass(ix, h, "spellblade")).toMatch(/Fighter 5 \(has 1\).*Mage 5/);
    expect(() => chooseClass(ix, h, "mage", rng())).toThrow(/INT 12/);
  });

  it("makes the deepest class the main one; the first learned wins a tie", () => {
    const h = hero("fighter", { INT: 12 });
    h.classes = { fighter: 2, mage: 2 };
    expect(mainClass(h)).toBe("fighter");
    h.classes = { fighter: 2, mage: 3 };
    expect(mainClass(h)).toBe("mage");
  });

  it("goes up to level 50 now", () => {
    expect(library.levels.maxLevel).toBe(50);
    const h = hero("fighter", { DEX: 8, INT: 8, WIL: 8 });
    gainXp(ix, h, xpForLevel(ix, 20), rng());
    expect(h.level).toBe(20);
  });
});

describe("rewarding depth", () => {
  it("class levels add bonuses (rounded down) and hero levels add HP", () => {
    const h = hero("fighter");
    expect(depthPassives(ix, h)).toEqual([]);
    h.level = 11;
    h.classes = { fighter: 11 };
    // Fighter: +0.4 attack and +1 HP per level past the first; +1 HP per hero level.
    expect(depthPassives(ix, h)).toEqual([
      { type: "modifyStat", stat: "maxHp", amount: 10 },
      { type: "modifyStat", stat: "attack", amount: 4 },
      { type: "modifyStat", stat: "maxHp", amount: 10 },
    ]);
  });

  it("a Fighter 50 hits much harder than a Fighter 10", () => {
    const at = (level: number) => {
      const h = hero("fighter");
      h.level = level;
      h.classes = { fighter: level };
      return heroSheet(ix, h).derived;
    };
    expect(at(50).attack - at(10).attack).toBeGreaterThanOrEqual(15);
    expect(at(50).maxHp).toBeGreaterThanOrEqual(at(10).maxHp + 80);
  });

  it("milestone levels offer the class's milestone perks, which never come at random", () => {
    const h = hero("fighter", { DEX: 8, INT: 8, WIL: 8 });
    levelInto(h, "fighter", 3);
    gainXp(ix, h, xpForLevel(ix, 5) - h.xp, rng());
    expect(h.classes.fighter).toBe(5);
    expect(h.levelUps[0]!.offers).toEqual(["weapon-master", "iron-hide"]);
    const special = new Set(
      library.classes.flatMap((c) => Object.values(c.milestones ?? {}).flat()),
    );
    for (const p of perkPool(ix, h, "fighter")) expect(special.has(p.id)).toBe(false);
  });

  it("class abilities come from class levels, across every class the hero has", () => {
    const h = hero("fighter", { INT: 12 });
    h.level = 6;
    h.classes = { fighter: 4, mage: 2 };
    const known = knownAbilityIds(ix, h);
    expect(known).toEqual(expect.arrayContaining(["power-strike", "second-wind", "firebolt"]));
    expect(known).not.toContain("frost-lance");
    expect(upcomingAbilities(ix, h).map((u) => [u.ability.id, u.classId, u.level])).toEqual([
      ["frost-lance", "mage", 4],
      ["whirlwind", "fighter", 7],
      ["fireball", "mage", 7],
    ]);
  });
});

describe("advanced and combo classes", () => {
  it("a combo opens at its class levels and stats", () => {
    const h = hero("fighter", { STR: 14, INT: 12, DEX: 8, WIL: 8 });
    levelInto(h, "fighter", 4);
    levelInto(h, "mage", 5);
    expect(h.classes).toEqual({ fighter: 5, mage: 5 });
    const opt = (id: string) => classOptions(ix, h).find((o) => o.cls.id === id)!;
    expect(opt("spellblade").ok).toBe(true);
    levelInto(h, "spellblade", 1);
    expect(classLine(ix, h)).toBe("Fighter 5 / Mage 5 / Spellblade 1");
    expect(knownAbilityIds(ix, h)).toContain("flame-blade");
    expect(heroSheet(ix, h).tags).toEqual(
      expect.arrayContaining(["fighter", "mage", "spellblade"]),
    );
  });

  it("an advanced class can need a building", () => {
    const h = hero("mage", { INT: 18 });
    h.level = 10;
    h.classes = { mage: 10 };
    h.xp = xpForLevel(ix, 10);
    const frost = (built?: (id: string) => boolean) =>
      classOptions(ix, h, built).find((o) => o.cls.id === "frost-mage")!;
    expect(frost().missing).toEqual(["a Library"]);
    expect(frost((id) => id === "library").ok).toBe(true);
  });

  it("recruits and porters can only start in a base class", () => {
    const t = newTown(ix, heroNames, 3);
    const r = t.recruits.find((x) => x.untrained)!;
    expect(() => hire(ix, t, r.id, "spellblade")).toThrow(/base class/);
  });

  it("a Fighter with Mage levels still pulls a downed friend back up", () => {
    const f = hero("fighter", { INT: 12 });
    f.level = 4;
    f.classes = { fighter: 3, mage: 1 };
    const friend = createHero(ix, { id: "friend", name: "Ilsa", classId: "scout" }, rng(2));
    friend.hp = 0;
    const r = runCombat(ix, [f, friend], ["giant-rat"], { seed: 3, maxRounds: 3 });
    expect(r.log.some((e) => e.text.includes("Mend"))).toBe(true);
  });
});

describe("in town", () => {
  function levelled(): { t: TownState; id: string } {
    const t = structuredClone(autoStart(ix, newTown(ix, heroNames, 4)));
    const h = t.roster.find((x) => x.classId === "fighter")!;
    h.stats = { ...h.stats, INT: 12 };
    gainXp(ix, h, xpForLevel(ix, 2), rng());
    return { t, id: h.id };
  }

  it("puts a level into a new class, with news, and then the perk is picked as usual", () => {
    const { t, id } = levelled();
    expect(() => chooseLevelUp(ix, t, id, undefined)).toThrow(/class gets this level/);
    const after = chooseLevelClass(ix, t, id, "mage");
    const h = after.roster.find((x) => x.id === id)!;
    expect(h.classes).toEqual({ fighter: 1, mage: 1 });
    expect(after.news.at(-1)!.text).toMatch(/started training as a Mage/);
    const done = chooseLevelUp(ix, after, id, h.levelUps[0]!.offers[0]);
    expect(done.roster.find((x) => x.id === id)!.levelUps).toEqual([]);
  });
});
