/**
 * The Hearthstone's heart (M8.22, DESIGN.md §20): every floor above held, a
 * party fights the heart's guardian, and shuts it off for good.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { dungeonDay, newDungeon, type StoneSeal } from "./dungeon";
import { makeBody } from "./fallen";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, heroSheet, type Hero } from "./hero";
import { chooseClass, gainXp, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { importSave } from "./save";
import {
  autoStart,
  cantLaunch,
  cantReachCore,
  launch,
  newTown,
  rest,
  setCore,
  storySoFar,
  type TownState,
} from "./town";
import { coreNews } from "./town/core";

const ix = indexLibrary(library);
const CORE = library.core.floor;

const gate = (stone: string, over: Partial<StoneSeal> = {}): StoneSeal => ({
  stone,
  day: 1,
  setting: "shut",
  strain: 0,
  level: 1,
  damaged: false,
  ...over,
});

/** Every floor above the heart held by a stone. */
const allHeld = (): Record<number, StoneSeal> =>
  Object.fromEntries(library.shards.map((s) => [s.floor, gate(`seal-stone-${s.id}-cleansed`)]));

function heldTown(): TownState {
  const t = autoStart(ix, newTown(ix, heroNames, 5));
  return { ...t, dungeon: { ...t.dungeon, stones: allHeld() } };
}

/** A party of `classes` at this level, healed up. */
function party(level: number, seed: number, classes: string[]): Hero[] {
  const rng = createRng(seed);
  const heroes = createStarterParty(ix, heroNames, rng, classes);
  const stats = ["END", "STR", "DEX", "WIL", "INT", "PER", "CHA"] as const;
  for (const h of heroes) {
    gainXp(ix, h, xpForLevel(ix, level) - h.xp, rng);
    while (h.levelUps.length) {
      const up = h.levelUps[0]!;
      if (!up.classId) chooseClass(ix, h, h.classId, rng);
      const free = up.freeStat
        ? stats.find((s) => {
            try {
              spendLevelUp(ix, structuredClone(h), up.offers[0], s, createRng(1));
              return true;
            } catch {
              return false;
            }
          })
        : undefined;
      spendLevelUp(ix, h, up.offers[0], free, rng);
    }
    const sheet = heroSheet(ix, h);
    h.hp = sheet.derived.maxHp;
    h.mana = sheet.derived.mana;
  }
  return heroes;
}

const going: StandingOrders = { ...DEFAULT_ORDERS, targetFloor: CORE, core: true };

describe("the way to the heart", () => {
  it("opens only once every floor above it is held by a standing gateway", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    expect(cantReachCore(ix, t)).toMatch(/stairs below floor 1 have no Seal Stone/);
    const held = heldTown();
    expect(cantReachCore(ix, held)).toBeUndefined();
    const breached = {
      ...held,
      dungeon: { ...held.dungeon, stones: { ...allHeld(), 2: gate("x", { damaged: true }) } },
    };
    expect(cantReachCore(ix, breached)).toMatch(/below floor 2 is breached/);
  });

  it("sends the party to the heart's floor, and launch checks the way is open", () => {
    const t = setCore(ix, autoStart(ix, newTown(ix, heroNames, 5)), true);
    expect(t.orders).toMatchObject({ core: true, targetFloor: CORE });
    expect(cantLaunch(ix, t)).toMatch(/Every floor above the heart/);
    expect(setCore(ix, t, false).orders.core).toBeUndefined();
  });

  it("is a one-off order", () => {
    let t = setCore(ix, heldTown(), true);
    t = launch(ix, t, heroNames);
    expect(t.orders.core).toBeUndefined();
  });
});

describe("at the heart", () => {
  it("a seasoned party fights the guardian, cornered, and can shut it off", () => {
    let shut = 0;
    let reached = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const heroes = party(12, seed, ["fighter", "fighter", "cleric", "mage", "scout", "cleric"]);
      const r = runExpedition(ix, heroes, going, seed, newDungeon(ix).floors);
      if (!r.core) continue;
      reached++;
      const text = r.log.map((e) => e.text).join("\n");
      expect(text).toMatch(/Foreman's Shade is waiting/);
      expect(r.seen).toContain(library.core.guardian);
      if (r.core.shut) {
        shut++;
        expect(r.kills).toContain(library.core.guardian);
        expect(text).toMatch(/the Old Delve goes quiet/);
      }
    }
    expect(reached).toBeGreaterThan(6);
    expect(shut / reached).toBeGreaterThan(0.6);
  });

  it("is too much for a party that only just sealed floor 4", () => {
    let shut = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const heroes = party(8, seed, ["fighter", "fighter", "cleric", "mage"]);
      if (runExpedition(ix, heroes, going, seed, newDungeon(ix).floors).core?.shut) shut++;
    }
    expect(shut).toBeLessThan(2);
  });

  it("isn't gone for on an ordinary trip", () => {
    const heroes = party(12, 1, ["fighter", "fighter", "cleric", "mage"]);
    const r = runExpedition(ix, heroes, { ...going, core: false }, 1, newDungeon(ix).floors);
    expect(r.core).toBeUndefined();
  });
});

describe("shut off", () => {
  /** A town that hears a party shut the heart off on its trip's day 2. */
  function hears(t: TownState, shutIt = true): TownState {
    const o = {
      id: "o1",
      name: "Brannoc's party",
      left: t.day - 3,
      result: { core: { day: 2, shut: shutIt } },
    } as unknown as Parameters<typeof coreNews>[2];
    const s = structuredClone(t);
    coreNews(ix, s, o);
    return s;
  }

  it("the bottom floor breeds no more", () => {
    const d = newDungeon(ix);
    expect(dungeonDay(ix, d).day.spawned).toBeGreaterThan(0);
    const quiet = { ...d, core: { reached: 1, shut: { day: 1, by: "x" } } };
    expect(dungeonDay(ix, quiet).day.spawned).toBe(0);
  });

  it("brings the news, renown and the last pages", () => {
    const t0 = heldTown();
    const beaten = rest(ix, hears(t0, false), heroNames);
    expect(beaten.dungeon.core).toEqual({ reached: 1, shut: null });
    expect(beaten.story["the-heart"]).toBeDefined();
    expect(beaten.story["the-heart-stilled"]).toBeUndefined();
    let t = hears(beaten);
    expect(t.dungeon.core.shut).toEqual({ day: beaten.day - 3 + 2, by: "Brannoc's party" });
    expect(t.renown).toBe(beaten.renown + library.renown.deeds.core);
    t = rest(ix, t, heroNames);
    expect(storySoFar(ix, t).at(-1)!.chapter.id).toBe("the-heart-stilled");
    expect(cantReachCore(ix, t)).toMatch(/already shut off/);
    // Shut once is shut: a later party there changes nothing.
    expect(hears(t).dungeon.core.shut).toEqual(t.dungeon.core.shut);
  });

  it("the dead lie still", () => {
    const withBody = (shut: boolean): TownState => {
      const t = heldTown();
      const hero = t.roster[0]!;
      return {
        ...t,
        dungeon: {
          ...t.dungeon,
          core: { reached: 1, shut: shut ? { day: 1, by: "x" } : null },
        },
        sites: [
          {
            id: "s1",
            floor: 2,
            room: 1,
            day: t.day,
            party: "Lost",
            trapped: [],
            bodies: [makeBody("b1", hero, t.day - 40, 2)],
            items: [],
            heard: t.day - 40,
          } as unknown as TownState["sites"][number],
        ],
      };
    };
    expect(rest(ix, withBody(false), heroNames).risen).toHaveLength(1);
    expect(rest(ix, withBody(true), heroNames).risen).toHaveLength(0);
  });

  it("an old save's heart is still beating", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 5));
    const old = structuredClone(t) as unknown as Record<string, unknown>;
    const dungeon = { ...(old.dungeon as Record<string, unknown>) };
    delete dungeon.core;
    old.dungeon = dungeon;
    old.version = 24;
    const back = importSave(
      ix,
      JSON.stringify({ game: "dungeon-party-builder", version: 24, savedAt: "", town: old }),
    );
    expect(back.dungeon.core).toEqual({ reached: 0, shut: null });
  });
});
