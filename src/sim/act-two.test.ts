/**
 * Act Two (M8.36, DESIGN.md §21): the floors under the heart open once it's
 * shut, and the new bottom floor breeds in its place.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { actsOpen, addNewFloors, dungeonDay, floorsOpen, newDungeon, spawnRate } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition } from "./expedition";
import { createStarterParty, heroSheet } from "./hero";
import { chooseClass, gainXp, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { exportSave, importSave } from "./save";
import {
  autoStart,
  cantChooseWay,
  cantReachCore,
  chooseWay,
  heartWay,
  newTown,
  openShards,
  rest,
  shardProgress,
  type TownState,
} from "./town";
import { coreNews } from "./town/core";
import { effects } from "./town/read";

const ix = indexLibrary(library);
/** Every heart's state, with the Hearthstone's shut off. */
const shutHeart = {
  ...newDungeon(indexLibrary(library)).hearts,
  hearthstone: { reached: 1, shut: { day: 1, by: "x" } },
};

describe("Act Two", () => {
  it("keeps the floors under the heart closed until it's shut", () => {
    expect(floorsOpen(ix, 1).map((f) => f.depth)).toEqual([1, 2, 3, 4, 5]);
    expect(floorsOpen(ix, 2).map((f) => f.depth)).toContain(6);
    const d = newDungeon(ix);
    expect(d.floors).toHaveLength(ix.lib.hearts[0]!.floor);
    expect(addNewFloors(ix, d)).toBe(false);
  });

  it("opens the Keepers' Stair when the heart is shut, with news and a page", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const o = {
      id: "o1",
      name: "Brannoc's party",
      left: t.day - 3,
      result: { core: { heart: "hearthstone", day: 2, shut: true } },
    } as unknown as Parameters<typeof coreNews>[2];
    const s: TownState = structuredClone(t);
    coreNews(ix, s, o);
    // Act Two's floors: the Keepers' Stair and the Coal Halls (M8.38).
    expect(s.dungeon.floors).toHaveLength(7);
    expect(s.dungeon.floors[5]!.population).toBe(ix.floor(6).startPopulation);
    expect(s.news.map((n) => n.text).join("\n")).toMatch(/The Keepers' Stair/);
    // The town before is untouched.
    expect(t.dungeon.floors).toHaveLength(5);
  });

  it("breeds again at the new bottom floor, from a fresh start", () => {
    const quiet = { ...newDungeon(ix), hearts: shutHeart, days: 200 };
    expect(spawnRate(ix, quiet)).toBe(0);
    const opened = structuredClone(quiet);
    addNewFloors(ix, opened);
    // The rate starts over from the day the heart was shut, not from day 200's.
    expect(spawnRate(ix, opened)).toBeGreaterThan(0);
    expect(spawnRate(ix, opened)).toBeLessThan(spawnRate(ix, { ...newDungeon(ix), days: 200 }));
    const next = dungeonDay(ix, opened).dungeon;
    expect(next.floors.at(-1)!.population).toBeGreaterThan(opened.floors.at(-1)!.population);
  });

  it("gives an old save with the heart already shut its new floors on load", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const shut = { ...t, dungeon: { ...t.dungeon, hearts: shutHeart } };
    const up = importSave(ix, exportSave(shut, new Date(0)));
    expect(up.dungeon.floors).toHaveLength(7);
    expect(importSave(ix, exportSave(t, new Date(0))).dungeon.floors).toHaveLength(5);
  });

  it("lets a party go down to floor 6 once it's open, and not before", () => {
    const heroes = createStarterParty(ix, heroNames, createRng(1)).map((h) => ({
      ...h,
      stats: { ...h.stats, STR: 40, END: 40, DEX: 40 },
      hp: 999,
    }));
    const orders = { ...DEFAULT_ORDERS, retreat: { kind: "never" as const }, targetFloor: 6 };
    const floorsSeen = (floors: ReturnType<typeof newDungeon>["floors"]) =>
      runExpedition(ix, heroes, orders, 3, floors)
        .log.filter((e) => e.kind === "floor")
        .map((e) => e.floor);
    const d = newDungeon(ix);
    expect(Math.max(...floorsSeen(d.floors))).toBe(5);
    const opened = { ...structuredClone(d), hearts: shutHeart };
    addNewFloors(ix, opened);
    expect(floorsSeen(opened.floors)).toContain(6);
  });

  it("keeps floor 5's shards (the Coalstone's) hidden until there are stairs below it", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const isOldDelve = (id: string) => id.startsWith("old-delve-");
    expect(openShards(ix, t).some(isOldDelve)).toBe(false);
    expect(shardProgress(ix, t).map((p) => p.set.floor)).not.toContain(5);
    const opened: TownState = structuredClone({
      ...t,
      dungeon: { ...t.dungeon, hearts: shutHeart },
    });
    addNewFloors(ix, opened.dungeon);
    expect(openShards(ix, opened).filter(isOldDelve).sort()).toEqual([
      "old-delve-cache",
      "old-delve-mother",
      "old-delve-step",
      "old-delve-warden",
    ]);
    expect(shardProgress(ix, opened).find((p) => p.set.floor === 5)?.need).toBe(6);
  });

  it("lets a seasoned party take the Vein Mother's shard: a shard of the Coalstone", () => {
    const party = (seed: number) => {
      const rng = createRng(seed);
      const heroes = createStarterParty(ix, heroNames, rng, [
        "fighter",
        "fighter",
        "cleric",
        "mage",
      ]);
      for (const h of heroes) {
        gainXp(ix, h, xpForLevel(ix, 10) - h.xp, rng);
        while (h.levelUps.length) {
          const up = h.levelUps[0]!;
          if (!up.classId) chooseClass(ix, h, h.classId, rng);
          spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, rng);
        }
        const sheet = heroSheet(ix, h);
        h.hp = sheet.derived.maxHp;
        h.mana = sheet.derived.mana;
      }
      return heroes;
    };
    const d = { ...newDungeon(ix), hearts: shutHeart };
    addNewFloors(ix, d);
    const floors = d.floors.map((f) => ({ ...f }));
    floors[4]!.population = 15;
    const hunt = { ...DEFAULT_ORDERS, targetFloor: 5, clearPercent: 100 };
    let taken = 0;
    for (let seed = 1; seed <= 30 && !taken; seed++) {
      const r = runExpedition(ix, party(seed), hunt, seed, floors, {
        shards: ["old-delve-mother"],
      });
      if (!r.shards?.includes("old-delve-mother")) continue;
      taken++;
      const text = r.log.filter((e) => e.kind === "shard").map((e) => e.text);
      expect(text.join("\n")).toMatch(/pries a shard of the Coalstone/);
      expect([...r.haul, ...r.leftBehind].some((h) => h.item === "shard-old-delve")).toBe(true);
    }
    expect(taken).toBe(1);
  });
});

/** Four or six heroes at this level, healed up. */
function seasoned(level: number, seed: number, classes: string[]) {
  const rng = createRng(seed);
  const heroes = createStarterParty(ix, heroNames, rng, classes);
  for (const h of heroes) {
    gainXp(ix, h, xpForLevel(ix, level) - h.xp, rng);
    while (h.levelUps.length) {
      const up = h.levelUps[0]!;
      if (!up.classId) chooseClass(ix, h, h.classId, rng);
      spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, rng);
    }
    const sheet = heroSheet(ix, h);
    h.hp = sheet.derived.maxHp;
    h.mana = sheet.derived.mana;
  }
  return heroes;
}

/** A town with the Hearthstone's heart shut and Act Two's floors open. */
function actTwo(): TownState {
  const t = autoStart(ix, newTown(ix, heroNames, 5));
  const opened: TownState = structuredClone({ ...t, dungeon: { ...t.dungeon, hearts: shutHeart } });
  addNewFloors(ix, opened.dungeon);
  return opened;
}

const COALSTONE = ix.lib.hearts.find((h) => h.id === "coalstone")!;

describe("the Coalstone (M8.38)", () => {
  it("lies at the bottom of the Coal Halls, out of reach until floor 7 is open and every floor above held", () => {
    expect(COALSTONE.floor).toBe(7);
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    expect(cantReachCore(ix, t, COALSTONE)).toMatch(/Nobody has found the way down to floor 7/);
    const opened = actTwo();
    expect(opened.dungeon.floors).toHaveLength(7);
    expect(cantReachCore(ix, opened, COALSTONE)).toMatch(/below floor 1 have no Seal Stone/);
    // The Coal Halls breed now: they're the bottom of Act Two.
    expect(spawnRate(ix, opened.dungeon)).toBeGreaterThan(0);
  });

  it("opens floor 6's shards (the Coalstone's too) once the Coal Halls are open", () => {
    const opened = actTwo();
    const six = shardProgress(ix, opened).find((p) => p.set.floor === 6)!;
    expect(six.set.stone).toBe("Coalstone");
    expect(six.need).toBe(6);
    expect(openShards(ix, opened)).toContain("keepers-stair-mother");
  });

  it("banked down: the Coal Halls breed no more, Act Three opens below, and the Keepers' last slate turns up", () => {
    const t = actTwo();
    const o = {
      id: "o1",
      name: "Wren's party",
      left: t.day - 3,
      result: { core: { heart: "coalstone", day: 2, shut: true } },
    } as unknown as Parameters<typeof coreNews>[2];
    const s: TownState = structuredClone(t);
    coreNews(ix, s, o);
    expect(s.dungeon.hearts.coalstone!.shut).toEqual({ day: t.day - 1, by: "Wren's party" });
    expect(s.dungeon.hearts.hearthstone!.shut).not.toBeNull();
    expect(s.news.map((n) => n.text).join("\n")).toMatch(/shut off the heart of the Coalstone/);
    expect(actsOpen(ix, s.dungeon)).toBe(3);
    // Act Three opens below (M8.39-M8.41): the Glimmering, the Ember Deeps and the Kiln, which breed now.
    expect(s.dungeon.floors.map((_, i) => ix.floor(i + 1).name).slice(7)).toEqual([
      "The Glimmering",
      "The Ember Deeps",
      "The Kiln",
    ]);
    expect(spawnRate(ix, s.dungeon)).toBeGreaterThan(0);
    const after = rest(ix, s, heroNames);
    expect(after.story["coalstone-stilled"]).toBeDefined();
    expect(cantReachCore(ix, after, COALSTONE)).toMatch(/already shut off/);
  });

  it("is stilled by a strong party most of the time, and is more than a heart-level party can manage", () => {
    const floors = actTwo().dungeon.floors;
    const going = { ...DEFAULT_ORDERS, targetFloor: 7, core: true };
    const six = ["fighter", "fighter", "cleric", "mage", "scout", "cleric"];
    const tally = (level: number) => {
      let reached = 0;
      let shut = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const r = runExpedition(ix, seasoned(level, seed, six), going, seed, floors);
        if (!r.core) continue;
        expect(r.core.heart).toBe("coalstone");
        reached++;
        if (r.core.shut) {
          shut++;
          expect(r.kills).toContain("banked-fire");
          expect(r.log.map((e) => e.text).join("\n")).toMatch(/Keeper's echoes are waiting/);
        }
      }
      return shut / Math.max(1, reached);
    };
    expect(tally(14)).toBeGreaterThan(0.5);
    expect(tally(12)).toBeLessThan(0.7);
  });
});

describe("the Glimmering (M8.39)", () => {
  it("opens below the banked Coalstone, and with it floor 7's nine shards (the Emberstone's)", () => {
    const t = actTwo();
    expect(shardProgress(ix, t).map((p) => p.set.floor)).not.toContain(7);
    const banked: TownState = structuredClone(t);
    banked.dungeon.hearts = {
      ...banked.dungeon.hearts,
      coalstone: { reached: 1, shut: { day: 1, by: "x" } },
    };
    addNewFloors(ix, banked.dungeon);
    expect(ix.floor(8).name).toBe("The Glimmering");
    expect(banked.dungeon.floors).toHaveLength(10);
    const seven = shardProgress(ix, banked).find((p) => p.set.floor === 7)!;
    expect(seven.set.stone).toBe("Emberstone");
    expect(seven.need).toBe(9);
    expect(openShards(ix, banked)).toEqual(
      expect.arrayContaining(["coal-halls-lamplighter", "coal-halls-moth", "coal-halls-king"]),
    );
  });
});

describe("the Ember Deeps (M8.40)", () => {
  it("opens with the Glimmering, and with it floor 8's nine shards (the Emberstone's)", () => {
    const t = actTwo();
    const banked: TownState = structuredClone(t);
    banked.dungeon.hearts = {
      ...banked.dungeon.hearts,
      coalstone: { reached: 1, shut: { day: 1, by: "x" } },
    };
    addNewFloors(ix, banked.dungeon);
    expect(ix.floor(9).name).toBe("The Ember Deeps");
    expect(ix.floor(9).ground?.name).toBe("Choking ash");
    const eight = shardProgress(ix, banked).find((p) => p.set.floor === 8)!;
    expect(eight.set.stone).toBe("Emberstone");
    expect(eight.need).toBe(9);
    expect(openShards(ix, banked)).toEqual(
      expect.arrayContaining(["glimmering-drinker", "glimmering-sleeper", "glimmering-colossus"]),
    );
    // Floor 9's own shards come with the Kiln below it (M8.41).
    expect(shardProgress(ix, banked).map((p) => p.set.floor)).toContain(9);
  });
});

const EMBERSTONE = ix.lib.hearts.find((h) => h.id === "emberstone")!;

/** A town with the Hearthstone and Coalstone still, Act Three's floors open. */
function actThree(): TownState {
  const t = actTwo();
  t.dungeon.hearts = { ...t.dungeon.hearts, coalstone: { reached: 1, shut: { day: 1, by: "x" } } };
  addNewFloors(ix, t.dungeon);
  return t;
}

/** Act Three with the Emberstone still too, and gold and both buildings to choose with. */
function stilled(): TownState {
  const t = actThree();
  const o = {
    id: "o1",
    name: "Isolde's party",
    left: t.day - 3,
    result: { core: { heart: "emberstone", day: 2, shut: true } },
  } as unknown as Parameters<typeof coreNews>[2];
  coreNews(ix, t, o);
  t.gold = 5000;
  t.buildings = { ...t.buildings, temple: 1, "black-market": 1 };
  t.materials = {
    ...t.materials,
    glowcap: 20,
    "deep-silver": 20,
    "spider-silk": 20,
    "iron-bands": 20,
    "bone-dust": 20,
  };
  return t;
}

describe("the Kiln and the Emberstone (M8.41)", () => {
  it("opens the Kiln with Act Three, floor 9's nine shards, and the Emberstone out of reach until every floor is held", () => {
    const t = actThree();
    expect(t.dungeon.floors).toHaveLength(10);
    expect(ix.floor(10).name).toBe("The Kiln");
    const nine = shardProgress(ix, t).find((p) => p.set.floor === 9)!;
    expect(nine.set.stone).toBe("Emberstone");
    expect(nine.need).toBe(9);
    expect(openShards(ix, t)).toEqual(
      expect.arrayContaining(["ember-deeps-worm", "ember-deeps-choir", "ember-deeps-king"]),
    );
    expect(EMBERSTONE.floor).toBe(10);
    expect(cantReachCore(ix, t, EMBERSTONE)).toMatch(/below floor 1 have no Seal Stone/);
    // Nothing lies below the Kiln: the pit ends here.
    expect(floorsOpen(ix, 4)).toHaveLength(10);
  });

  it("stilled: the Kiln breeds no more, no floors open below, and the guild is asked to decide", () => {
    const t = stilled();
    expect(t.dungeon.floors).toHaveLength(10);
    expect(spawnRate(ix, t.dungeon)).toBe(0);
    const after = rest(ix, t, heroNames);
    expect(after.story["emberstone-stilled"]).toBeDefined();
    expect(after.story["emberstone-mended"]).toBeUndefined();
    expect(heartWay(after, EMBERSTONE)).toBeUndefined();
  });

  it("can only be mended or bound once it's still, with the building, gold and materials", () => {
    expect(cantChooseWay(ix, actThree(), EMBERSTONE, "mended")).toMatch(/has to be still first/);
    const t = stilled();
    expect(
      cantChooseWay(ix, { ...t, buildings: { ...t.buildings, temple: 0 } }, EMBERSTONE, "mended"),
    ).toMatch(/needs the Temple/);
    expect(cantChooseWay(ix, { ...t, gold: 10 }, EMBERSTONE, "bound")).toMatch(/Not enough gold/);
    expect(cantChooseWay(ix, { ...t, materials: {} }, EMBERSTONE, "bound")).toMatch(/Short of/);
    expect(cantChooseWay(ix, t, EMBERSTONE, "mended")).toBeUndefined();
    expect(cantChooseWay(ix, t, EMBERSTONE, "nonsense")).toMatch(/can't be done/);
  });

  it("mended: every floor is made safe, nothing breeds, the town is blessed and Good heroes are glad", () => {
    const t = stilled();
    t.dungeon.floors.forEach((f) => (f.population = 40));
    const m = chooseWay(ix, t, EMBERSTONE, "mended");
    expect(m.gold).toBe(t.gold - 2000);
    expect(m.materials.glowcap).toBe(t.materials.glowcap! - 12);
    expect(m.dungeon.floors.every((f) => f.population === 0)).toBe(true);
    expect(spawnRate(ix, m.dungeon)).toBe(0);
    expect(dungeonDay(ix, m.dungeon).dungeon.floors.every((f) => f.population === 0)).toBe(true);
    expect(effects(ix, m)).toContainEqual({ type: "restMorale", amount: 2 });
    expect(heartWay(m, EMBERSTONE)?.id).toBe("mended");
    expect(() => chooseWay(ix, m, EMBERSTONE, "bound")).toThrow(/already chosen/);
    // Its last chapter opens at once, for the ending card.
    expect(m.story["emberstone-mended"]).toBe(m.day);
    expect(rest(ix, m, heroNames).story["emberstone-bound"]).toBeUndefined();
    // The town before is untouched.
    expect(t.dungeon.floors[0]!.population).toBe(40);
  });

  it("bound: the stone works for the guild, and the Kiln never quite sleeps", () => {
    const t = stilled();
    const b = chooseWay(ix, t, EMBERSTONE, "bound");
    expect(spawnRate(ix, b.dungeon)).toBe(2);
    expect(effects(ix, b)).toEqual(
      expect.arrayContaining([
        { type: "fence", amount: 10 },
        { type: "xpPercent", amount: 25 },
      ]),
    );
    expect(b.story["emberstone-bound"]).toBe(b.day);
  });
});
