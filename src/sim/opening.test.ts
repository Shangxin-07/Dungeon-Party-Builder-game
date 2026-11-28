/**
 * The opening and posts round the pit (DESIGN.md §8): a new game can start at
 * the mining camp, held from makeshift posts, with no delving until the Guild
 * Hall and a palisade are up.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { indexLibrary } from "./library";
import type { RaidReport } from "./raid";
import { stocked } from "./stocked";
import {
  assignPost,
  autoStart,
  campNeeds,
  cantLaunch,
  defence,
  hire,
  hirePorter,
  kitOut,
  newTown,
  postOf,
  rest,
  rosterSize,
  trade,
  trainMiner,
  upgrade,
  retainerBill,
  warningDays,
  type TownState,
} from "./town";
import { raidSpoils } from "./town/posts";
import { makeRecruit } from "./town/start";
import { baseClasses, bestClass } from "./hero";
import { classOptions, openClasses } from "./levels";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const opening = library.opening;
const camp = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed, { camp: true }));
const ids = (t: TownState) => t.roster.map((h) => h.id);
const makeRecruitFor = (t: TownState) => makeRecruit(ix, t, heroNames);

/** Pay for an upgrade and skip the builders' wait. */
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, stocked({ ...t, gold: t.gold + 10_000 }), id);
  const t2 = { ...u, gold: t.gold, materials: t.materials, construction: [] };
  t2.buildings = { ...u.buildings, [id]: (t.buildings[id] ?? 0) + 1 };
  return t2;
};

describe("the mining camp", () => {
  it("starts with makeshift kit, no Guild Hall, and no delving", () => {
    const t = camp();
    expect(t.camp).toBe(true);
    expect(t.buildings["guild-hall"]).toBe(0);
    expect(t.gold).toBe(opening.startingGold);
    // Whatever the miners aren't holding is in the store room.
    const held = t.roster.flatMap((h) => Object.values(h.equipment).filter(Boolean));
    expect([...t.stash, ...held].sort()).toEqual([...opening.startingStash].sort());
    expect(rosterSize(ix, t)).toBe(opening.campRoster);
    expect(campNeeds(ix, t)).toEqual(["Guild Hall", "Palisade"]);
    expect(cantLaunch(ix, t)).toMatch(/camp is held: build Guild Hall and Palisade/);
    // A normal new game skips all of it.
    const normal = newTown(ix, heroNames, 1);
    expect(normal.camp).toBeUndefined();
    expect(normal.buildings["guild-hall"]).toBe(1);
  });

  it("is held once the Guild Hall and palisade are up: delving opens, the kit arrives", () => {
    let t = camp();
    t = assignPost(ix, t, ids(t)[0]!, "seam");
    t = build(t, "guild-hall");
    t = rest(ix, t, heroNames);
    expect(t.camp).toBe(true);
    const stash = t.stash.length;
    t = build(t, "palisade");
    t = rest(ix, t, heroNames);
    expect(t.camp).toBeUndefined();
    expect(campNeeds(ix, t)).toEqual([]);
    expect(t.stash.length).toBe(stash + opening.heldStash.length);
    expect(t.news.some((n) => /camp is held/.test(n.text))).toBe(true);
    // The seam closes with the camp.
    expect(t.posts.seam).toBeUndefined();
    expect(() => assignPost(ix, t, ids(t)[0]!, "seam")).toThrow(/closed/);
    // Nobody was picked at the camp (no party slots); now a party can go.
    expect(cantLaunch(ix, t)).toMatch(/Pick at least one/);
    // ...once the miners have picked their classes.
    expect(cantLaunch(ix, { ...t, party: ids(t).slice(0, 3) })).toMatch(/still a miner/);
    for (const id of ids(t)) t = trainMiner(ix, t, id, bestClass(ix, t.roster.find((h) => h.id === id)!.stats));
    expect(cantLaunch(ix, { ...t, party: ids(t).slice(0, 3) })).toBeUndefined();
  });
});

describe("miners", () => {
  it("the starting heroes are already at the camp as miners: nobody to hire", () => {
    const t = newTown(ix, heroNames, 3, { camp: true });
    expect(t.roster).toHaveLength(library.town.startingRecruits);
    expect(t.roster.every((h) => h.classId === opening.campClass && !h.untrained)).toBe(true);
    expect(t.freeHires).toBe(0);
    expect(t.recruits).toEqual([]);
    expect(t.roster.filter((h) => h.equipment.weapon).length).toBeGreaterThanOrEqual(3);
    // A normal game still starts with recruits to sign.
    expect(newTown(ix, heroNames, 3).roster).toEqual([]);
  });

  it("anyone signed at the camp signs as a miner, and kitting out never spends gold", () => {
    let t = camp(4);
    t = { ...t, recruits: [makeRecruitFor(t)] };
    t = hire(ix, t, t.recruits[0]!.id, "mage");
    const h = t.roster.at(-1)!;
    expect(h.classId).toBe(opening.campClass);
    const gold = t.gold;
    t = kitOut(ix, { ...t, stash: [] }, h.id);
    expect(t.gold).toBe(gold);
    expect(t.ledger.some((l) => l.kind === "bought")).toBe(false);
  });

  it("retainers read nothing at the camp", () => {
    const t = camp();
    expect(retainerBill(ix, t)).toBe(0);
    expect(retainerBill(ix, { ...t, camp: undefined })).toBeGreaterThan(0);
  });

  it("a miner can't train until the camp is held, then keeps their levels and earned stats", () => {
    let t = camp(5);
    const id = ids(t)[0]!;
    expect(() => trainMiner(ix, t, id, "fighter")).toThrow(/camp is held/);
    const h0 = t.roster[0]!;
    const levelled = { ...h0, level: 3, classes: { miner: 3 }, stats: { ...h0.stats, END: 13, STR: 11 } };
    t = { ...t, camp: undefined, roster: [levelled, ...t.roster.slice(1)] };
    expect(() => trainMiner(ix, t, id, "spellblade")).toThrow(/base class/);
    // Training points (M9.10): STR to the fighter's gate and up, END from 13.
    const spend = { STR: 3, END: 1 };
    t = trainMiner(ix, t, id, "fighter", spend);
    const h = t.roster[0]!;
    expect(h.classId).toBe("fighter");
    expect(h.classes).toEqual({ fighter: 3 });
    expect(h.stats.END).toBe(14);
    expect(h.stats.STR).toBe(14);
    expect(h.row).toBe("front");
    expect(() => trainMiner(ix, t, id, "mage")).toThrow(/already/);
  });

  it("is never offered at a level-up or to recruits", () => {
    const t = camp();
    expect(baseClasses(ix).some((c) => c.id === opening.campClass)).toBe(false);
    const fighter = { ...t.roster[0]!, classId: "fighter", classes: { fighter: 2 } };
    expect(classOptions(ix, fighter).some((o) => o.cls.id === opening.campClass)).toBe(false);
    // A miner still at the camp levels up in the only class they have.
    expect(openClasses(ix, t.roster[0]!).map((o) => o.cls.id)).toEqual([opening.campClass]);
  });
});

describe("no dead ends at the camp", () => {
  it("nobody is paid until the camp is held", () => {
    let t = camp();
    const gold = t.gold;
    for (let d = 0; d < 5; d++) t = rest(ix, t, heroNames);
    expect(t.ledger.some((l) => l.kind === "wages")).toBe(false);
    expect(t.gold).toBeGreaterThanOrEqual(gold);
    t = build(build(t, "guild-hall"), "palisade");
    t = rest(ix, t, heroNames);
    expect(t.camp).toBeUndefined();
    t = rest(ix, t, heroNames);
    expect(t.ledger.some((l) => l.kind === "wages")).toBe(true);
  });

  it("the Guild Hall costs timber, not gold, so it can be built with an empty purse", () => {
    const t = { ...camp(), gold: 0, materials: { timber: 6 } };
    const after = upgrade(ix, t, "guild-hall");
    expect(after.gold).toBe(0);
    expect(after.materials).toEqual({});
  });

  it("the miners swap ore for timber, only at the camp", () => {
    const t = { ...camp(), materials: { "iron-ore": 3 } };
    const after = trade(ix, t, 0);
    expect(after.materials).toEqual({ "iron-ore": 1, timber: 1 });
    expect(() => trade(ix, after, 0)).toThrow(/short of 1 iron ore/);
    expect(() => trade(ix, { ...t, camp: undefined }, 0)).toThrow(/only trade while the camp/);
  });

  it("is held even when the posts never turn up timber, walls first", () => {
    // Bad luck at its worst: salvage and spoils only ever give ore.
    const lib: Library = {
      ...library,
      lootTables: library.lootTables.map((l) => ({
        ...l,
        entries: l.entries.map((e) => (e.item === "timber" ? { ...e, item: "iron-ore" } : e)),
      })),
    };
    const ux = indexLibrary(lib);
    for (const seed of [1, 2, 3]) {
      let t = autoStart(ux, newTown(ux, heroNames, seed, { camp: true }));
      const [a, b, c, d] = ids(t);
      t = assignPost(ux, assignPost(ux, t, a!, "salvage"), b!, "salvage");
      t = assignPost(ux, assignPost(ux, t, c!, "seam"), d!, "barricade");
      for (let day = 0; day < 40 && t.camp; day++) {
        while ((t.materials["iron-ore"] ?? 0) >= 2) t = trade(ux, t, 0);
        for (const id of ["palisade", "guild-hall"]) {
          try {
            if (!t.buildings[id] && !t.construction.some((c2) => c2.building === id))
              t = upgrade(ux, t, id);
          } catch {
            // Not yet affordable.
          }
        }
        t = rest(ux, t, heroNames);
      }
      expect(t.camp, `seed ${seed}`).toBeUndefined();
    }
  });
});

describe("posts", () => {
  it("hold one hero each, up to their slots", () => {
    let t = camp();
    const [a, b] = ids(t);
    t = assignPost(ix, t, a!, "lookout");
    expect(postOf(t, a!)).toBe("lookout");
    expect(() => assignPost(ix, t, b!, "lookout")).toThrow(/no room/);
    t = assignPost(ix, t, a!, "barricade");
    expect(t.posts.lookout).toBeUndefined();
    expect(postOf(t, a!)).toBe("barricade");
    t = assignPost(ix, t, a!, undefined);
    expect(postOf(t, a!)).toBeUndefined();
  });

  it("the barricade adds defence and a lookout sees the next night, while they're home and fit", () => {
    let t = camp();
    const [a, b, c] = ids(t);
    expect(defence(ix, t)).toBe(0);
    t = assignPost(ix, assignPost(ix, t, a!, "barricade"), b!, "barricade");
    t = assignPost(ix, t, c!, "lookout");
    expect(defence(ix, t)).toBe(2 + 2 + 1);
    expect(warningDays(ix, t)).toBe(1);
    expect(defence(ix, t, new Set([a!]))).toBe(2 + 1);
    t.roster.find((h) => h.id === b)!.injuries = [{ id: library.injuries[0]!.id, days: 3 }];
    expect(defence(ix, t)).toBe(2 + 1);
  });

  it("porters can salvage but don't stand at the barricade", () => {
    let t = camp();
    const r = t.recruits.find((x) => x.untrained);
    if (!r) return;
    t = hirePorter(ix, { ...t, gold: 500 }, r.id);
    const p = t.roster.at(-1)!;
    expect(() => assignPost(ix, t, p.id, "barricade")).toThrow(/Porters/);
    expect(() => assignPost(ix, t, p.id, "salvage")).not.toThrow();
  });

  it("the salvage crew brings in timber and the seam brings in gold", () => {
    let t = camp();
    const [a, b, c] = ids(t);
    t = assignPost(ix, assignPost(ix, t, a!, "salvage"), b!, "salvage");
    t = assignPost(ix, t, c!, "seam");
    let gathered = 0;
    for (let d = 0; d < 10; d++) {
      t = rest(ix, t, heroNames);
      gathered += t.gathered?.gold ?? 0;
    }
    expect(t.materials.timber ?? 0).toBeGreaterThan(5);
    expect(gathered).toBeGreaterThan(40);
    expect(t.ledger.some((l) => l.kind === "gathered" && l.amount > 0)).toBe(true);
  });
});

describe("raid spoils", () => {
  it("dead raiders leave materials, never gold", () => {
    const t = camp();
    const gold = t.gold;
    raidSpoils(ix, t, { kills: 40 } as RaidReport);
    expect(t.materials.timber ?? 0).toBeGreaterThan(5);
    expect(t.gold).toBe(gold);
    expect(t.news.some((n) => /dead raiders/.test(n.text))).toBe(true);
  });
});

describe("opening content checks", () => {
  it("catch posts with unknown loot and openings that unlock missing buildings", () => {
    const bad: Library = {
      ...library,
      posts: [
        {
          id: "x",
          name: "X",
          blurb: "",
          slots: 0,
          effects: [{ type: "gather", loot: "nope", rolls: 1 }],
        },
      ],
      opening: { ...library.opening, unlock: { moat: 1 } },
    };
    const errors = validateLibrary(bad).join("\n");
    expect(errors).toMatch(/post "x": slots/);
    expect(errors).toMatch(/unknown loot table "nope"/);
    expect(errors).toMatch(/opening: unknown building "moat"/);
  });
});
