/** The fallen (DESIGN.md §10): bodies, the Temple, the Graveyard and the risen. */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { runCombat } from "./combat";
import { DEFAULT_ORDERS, runExpedition } from "./expedition";
import { makeBody, risenHero, type Risen } from "./fallen";
import { createHero, createStarterParty, type Hero } from "./hero";
import { gainXp, loseLevels, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import {
  autoStart,
  bury,
  launch,
  newTown,
  planRescue,
  rest,
  resurrect,
  resurrectQuote,
  setOrders,
  TownError,
  upgrade,
  type TownState,
} from "./town";
import { stocked } from "./stocked";

const ix = indexLibrary(library);
const rng = (seed = 1) => createRng(seed);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, stocked({ ...t, gold: t.gold + 10_000 }), id);
  const done = Object.fromEntries(u.construction.map((c) => [c.building, c.level]));
  return { ...u, gold: t.gold, buildings: { ...u.buildings, ...done }, construction: [] };
};

/** A fighter (who can't learn anything else) taken to `level`, every level spent. */
function veteran(level: number, seed = 1, spend = true): Hero {
  const h = createHero(ix, { id: `v${seed}`, name: `Vet ${seed}`, classId: "fighter" }, rng(seed));
  h.stats = { ...h.stats, DEX: 8, INT: 8, WIL: 8 };
  const r = rng(seed + 100);
  gainXp(ix, h, xpForLevel(ix, level), r);
  while (spend && h.levelUps.length) {
    const up = h.levelUps[0]!;
    spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, r);
  }
  return h;
}

const pick = (h: Hero) => ({
  level: h.level,
  stats: h.stats,
  perks: h.perks,
  classes: h.classes,
  levelUps: h.levelUps.length,
});

describe("losing levels to a resurrection", () => {
  it("takes the most recent levels off the top: class levels, stat gains, perks, free stats", () => {
    const h = veteran(7);
    const before = structuredClone(h);
    expect(loseLevels(ix, h, 2)).toBe(2);
    expect(h.level).toBe(5);
    expect(h.classes.fighter).toBe(5);
    expect(h.perks).toEqual(before.perks.slice(0, -2));
    expect(h.xp).toBe(xpForLevel(ix, 5));
    // Level 6 had the free stat point (END).
    const growth = ix.cls("fighter").growth;
    expect(h.stats.END).toBe(before.stats.END - 2 * (growth.END ?? 0) - 1);
    expect(h.lost?.map((l) => l.level)).toEqual([6, 7]);
  });

  it("gives each lost level back exactly as it was when the XP is earned again", () => {
    const h = veteran(7);
    const before = pick(h);
    loseLevels(ix, h, 3);
    gainXp(ix, h, xpForLevel(ix, 7) - h.xp, rng(9));
    expect(pick(h)).toEqual(before);
    expect(h.lost).toBeUndefined();
    // And after that, levels come as normal.
    gainXp(ix, h, xpForLevel(ix, 8) - h.xp, rng(9));
    expect(h.level).toBe(8);
    expect(h.levelUps.length).toBe(1);
  });

  it("takes level-ups not yet spent first, and gives them back unspent", () => {
    const h = veteran(4);
    gainXp(ix, h, xpForLevel(ix, 6) - h.xp, rng(3));
    expect(h.levelUps.length).toBe(2);
    const before = pick(h);
    loseLevels(ix, h, 3);
    expect(h.level).toBe(3);
    expect(h.levelUps).toEqual([]);
    gainXp(ix, h, xpForLevel(ix, 6) - h.xp, rng(3));
    expect(pick(h)).toEqual(before);
  });

  it("never goes below level 1, and copes with levels from before they were recorded", () => {
    const h = veteran(5);
    delete h.past;
    const perks = [...h.perks];
    expect(loseLevels(ix, h, 10)).toBe(4);
    expect(h.level).toBe(1);
    expect(h.classes).toEqual({ fighter: 1 });
    expect(h.perks).toEqual(perks);
    gainXp(ix, h, xpForLevel(ix, 5), rng(1));
    expect(h.level).toBe(5);
    expect(h.classes).toEqual({ fighter: 5 });
  });
});

/** A town where the first hero has just died on a trip the party came home from. */
function deathOnTrip(): TownState {
  for (let seed = 1; seed < 400; seed++) {
    const t0 = setOrders(ix, fresh(seed), {
      ...DEFAULT_ORDERS,
      targetFloor: 2,
      retreat: { kind: "never" },
    });
    const t = launch(ix, t0, heroNames);
    if (t.lastTrip!.result.outcome !== "wiped" && t.bodies.length) return t;
  }
  throw new Error("nobody died on a trip the party came home from");
}

describe("bodies brought home", () => {
  it("a hero who dies on a trip the party survives is carried home", () => {
    const t = deathOnTrip();
    const b = t.bodies[0]!;
    expect(b.floor).toBe(0);
    expect(b.hero.condition).toBe("dead");
    expect(t.memorial.some((m) => m.heroId === b.hero.id)).toBe(true);
    expect(t.roster.some((h) => h.id === b.hero.id)).toBe(false);
  });

  it("the Temple brings them back, for gold, bone dust and levels", () => {
    let t = deathOnTrip();
    const b = t.bodies[0]!;
    expect(() => resurrect(ix, t, b.id)).toThrow(TownError);
    t = build(t, "temple");
    t = { ...t, gold: 5000, roster: t.roster.slice(0, 1), materials: { "bone-dust": 2 } };
    b.hero.level = 1;
    // The priests want 3 bone dust (content/buildings/temple.ts).
    expect(resurrectQuote(ix, t, b.id).terms!.materials).toEqual({ "bone-dust": 3 });
    expect(resurrectQuote(ix, t, b.id).why).toMatch(/short of 1 bone dust/);
    expect(() => resurrect(ix, t, b.id)).toThrow(/bone dust/);
    t = { ...t, materials: { "bone-dust": 3, "iron-ore": 1 } };
    const q = resurrectQuote(ix, t, b.id);
    expect(q.why).toBeUndefined();
    const after = resurrect(ix, t, b.id);
    expect(after.materials).toEqual({ "iron-ore": 1 });
    const h = after.roster.find((x) => x.id === b.hero.id)!;
    expect(h.condition).toBe("ok");
    expect(h.hp).toBeGreaterThan(0);
    expect(after.gold).toBe(5000 - q.terms!.gold);
    expect(after.bodies).toEqual([]);
    expect(after.memorial.some((m) => m.heroId === h.id)).toBe(false);
    expect(h.moraleLog.some((n) => /back from the dead/.test(n.reason))).toBe(true);
  });

  it("the Graveyard buries them, and the guild takes heart", () => {
    let t = deathOnTrip();
    const b = t.bodies[0]!;
    expect(() => bury(ix, t, b.id)).toThrow(TownError);
    t = build(t, "graveyard");
    const low = t.roster.map((h) => ({ ...h, morale: 40 }));
    t = { ...t, roster: low };
    const after = bury(ix, t, b.id);
    expect(after.bodies).toEqual([]);
    expect(after.memorial.find((m) => m.heroId === b.hero.id)?.buried).toBe(t.day);
    for (const h of after.roster) expect(h.morale).toBeGreaterThan(40);
  });
});

/** A wipe that leaves at least one body at a site. */
function wipeWithBody(): TownState {
  for (let seed = 0; seed < 400; seed++) {
    const t = setOrders(ix, fresh(seed), {
      ...DEFAULT_ORDERS,
      targetFloor: 3,
      retreat: { kind: "never" },
    });
    const after = launch(ix, t, heroNames);
    if (after.sites.some((s) => s.bodies.length)) return after;
  }
  throw new Error("no wipe left a body");
}

describe("bodies left in the dungeon", () => {
  it("rise after a while, wearing what's left of their gear", () => {
    let t = wipeWithBody();
    const site = t.sites.find((s) => s.bodies.length)!;
    const b = site.bodies[0]!;
    while (t.day < b.died + library.fallen.riseDays) t = rest(ix, t, heroNames);
    const r = t.risen.find((x) => x.body.hero.id === b.hero.id)!;
    expect(r).toBeTruthy();
    expect(r.floor).toBeLessThanOrEqual(site.floor);
    for (const id of Object.values(r.equipment)) expect(Object.values(b.gear)).toContain(id);
    expect(t.memorial.find((m) => m.heroId === b.hero.id)?.risen).toBe(true);
    expect(t.news.some((n) => /Risen/.test(n.text))).toBe(true);
  });

  it("a rescue run carries the bodies home", () => {
    // A party sent down nearly dead, with orders never to turn back, often
    // falls on floor 1: a quick search, whatever the content.
    for (let seed = 0; seed < 200; seed++) {
      const t0 = setOrders(ix, fresh(seed), {
        ...DEFAULT_ORDERS,
        targetFloor: 1,
        retreat: { kind: "never" },
      });
      for (const h of t0.roster) if (t0.party.includes(h.id)) h.hp = 1;
      let t = launch(ix, t0, heroNames);
      const site = t.sites.find((s) => s.bodies.length && s.floor === 1);
      if (!site) continue;
      t = structuredClone(t);
      for (let i = 0; i < 3; i++) {
        const h = veteran(6, 50 + i);
        h.hp = 999;
        t.roster.push(h);
        t.records[h.id] = { trips: 0, kills: 0, joined: t.day, deepest: 0, seen: [] };
      }
      t.party = t.roster.filter((h) => h.id.startsWith("v")).map((h) => h.id);
      t = planRescue(ix, { ...t, orders: { ...t.orders, targetFloor: 1 } }, site.id);
      const after = launch(ix, t, heroNames);
      if (after.lastTrip!.result.outcome === "wiped") continue;
      const names = site.bodies.map((b) => b.hero.name);
      expect(after.bodies.map((b) => b.hero.name)).toEqual(expect.arrayContaining(names));
      return;
    }
    throw new Error("no rescue run reached a floor-1 site");
  });
});

describe("the risen", () => {
  const body = () => {
    const h = veteran(5, 7);
    h.equipment = { weapon: "sword", armor: "chainmail" };
    return makeBody("b1", h, 3, 1);
  };
  const risen = (): Risen => ({
    id: "r1",
    body: body(),
    equipment: { weapon: "sword", armor: "chainmail" },
    floor: 1,
    rose: 10,
  });

  it("fight for the dungeon as their old class, tougher and undead", () => {
    const r = risen();
    const party = createStarterParty(ix, heroNames, rng(2));
    const res = runCombat(ix, party, ["giant-rat"], {
      seed: 4,
      risen: [risenHero(ix, r)],
    });
    const f = res.fighters.find((x) => x.risenId === "r1")!;
    expect(f.side).toBe("monsters");
    expect(f.name).toBe("Vet 7, Risen");
    expect(f.tags).toContain("undead");
    expect(f.weapon.name).toBe("sword");
    if (res.winner === "party") expect(res.risenSlain).toEqual(["r1"]);
  });

  it("turn up on their floor; put down, their gear and body come home", () => {
    const lib: Library = { ...library, fallen: { ...library.fallen, meetChance: 1 } };
    const lix = indexLibrary(lib);
    let slain = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const party = [0, 1, 2, 3].map((i) => {
        const h = veteran(6, 20 + i);
        h.equipment = { weapon: "war-axe", armor: "chainmail" };
        h.hp = 999;
        h.hp = Math.min(h.hp, 200);
        return h;
      });
      const r = runExpedition(lix, party, { ...DEFAULT_ORDERS, targetFloor: 1 }, seed, undefined, {
        risen: [risen()],
      });
      // Some floor-1 trips meet no monsters at all.
      if (!r.log.some((e) => e.kind === "fight" && e.monsters)) continue;
      expect(r.risenMet).toEqual(["r1"]);
      if (!r.risenSlain.includes("r1")) continue;
      slain++;
      expect(r.bodies.map((b) => b.risen)).toEqual([true]);
      expect(
        r.haul
          .filter((h) => h.owner === "Vet 7")
          .map((h) => h.item)
          .sort(),
      ).toEqual(["chainmail", "sword"]);
    }
    expect(slain).toBeGreaterThan(0);
  });

  it("can only be buried once they're home", () => {
    let t = build(fresh(1), "temple");
    t = { ...t, gold: 5000, bodies: [{ ...body(), floor: 0, risen: true }] };
    expect(resurrectQuote(ix, t, "b1").why).toMatch(/bury/);
    expect(() => resurrect(ix, t, "b1")).toThrow(TownError);
  });

  it("hurt the morale of anyone who knew them", () => {
    const lib: Library = { ...library, fallen: { ...library.fallen, meetChance: 1 } };
    const lix = indexLibrary(lib);
    let t = fresh(3);
    t = { ...t, risen: [risen()] };
    // Everyone joined on day 1; the risen hero died on day 3.
    const after = launch(lix, t, heroNames);
    expect(after.lastTrip!.result.risenMet).toEqual(["r1"]);
    const sent = after.lastTrip!.party.map((h) => h.id);
    const knew = after.roster.filter((h) => sent.includes(h.id));
    for (const h of knew)
      expect(h.moraleLog.some((n) => /risen friend|strike down/.test(n.reason))).toBe(true);
  });
});
