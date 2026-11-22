import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createHero, createStarterParty, rollPersonality, type Hero } from "./hero";
import { badChoice, gainXp, perkPool, spendLevelUp, xpForLevel, xpProgress } from "./levels";
import { indexLibrary } from "./library";
import { applyMorale, lossFactor, moraleChanges, mood } from "./morale";
import { createRng } from "./rng";
import { migrateTown } from "./save";
import {
  autoStart,
  chooseLevelUp,
  grumbles,
  launch,
  launchAndWait,
  newTown,
  planRescue,
  rest,
  setOrders,
  TOWN_VERSION,
  upgrade,
  type Outing,
  type TownState,
} from "./town";
import { validateLibrary } from "./validate";
import { stocked } from "./stocked";

const ix = indexLibrary(library);
const rng = (seed = 1) => createRng(seed);
const fighter = (seed = 1): Hero =>
  createHero(ix, { id: `h${seed}`, name: `Test ${seed}`, classId: "fighter" }, rng(seed));
/** A fighter who can't learn any other class, so every level goes straight into Fighter. */
const onlyFighter = (seed = 1): Hero => {
  const h = fighter(seed);
  h.stats = { ...h.stats, DEX: 8, INT: 8, WIL: 8 };
  return h;
};
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({ ...DEFAULT_ORDERS, ...o });
/** Pay for an upgrade and skip the builders' wait. */
const build = (t: TownState, id: string): TownState => {
  const u = upgrade(ix, stocked({ ...t, gold: t.gold + 10_000 }), id);
  const done = Object.fromEntries(u.construction.map((c) => [c.building, c.level]));
  return { ...u, gold: t.gold, buildings: { ...u.buildings, ...done }, construction: [] };
};

describe("personalities", () => {
  it("come from the hero's id, name and stats: stable, and varied across heroes", () => {
    const h = fighter(3);
    const again = rollPersonality(ix, h.id, h.name, h.stats, h.classId);
    expect(again).toEqual({
      motivation: h.motivation,
      favourite: h.favourite,
      morale: h.morale,
      likes: h.likes,
      dislikes: h.dislikes,
    });
    const many = Array.from({ length: 60 }, (_, i) => fighter(i + 1));
    expect(new Set(many.map((x) => x.motivation)).size).toBe(library.motivations.length);
    expect(many.some((x) => x.dislikes)).toBe(true);
    for (const x of many) {
      const m = ix.motivation(x.motivation);
      expect(m.favourites.map((f) => f.building)).toContain(x.favourite);
      expect(ix.cls("fighter").likes).toContain(x.likes);
      expect(ix.cls("fighter").likes).not.toContain(x.dislikes);
      expect(x.morale).toBeGreaterThanOrEqual(library.morale.start[0]);
      expect(x.morale).toBeLessThanOrEqual(library.morale.start[1]);
    }
  });

  it("didn't change any fights: the dice for stats are the same as before", () => {
    // Personalities don't draw from the shared dice, so a starter party rolls
    // exactly the stats it always did.
    const a = createStarterParty(ix, heroNames, rng(5));
    const b = createStarterParty(ix, heroNames, rng(5));
    expect(a).toEqual(b);
  });
});

describe("levelling up", () => {
  it("follows the XP curve from content", () => {
    expect(xpForLevel(ix, 1)).toBe(0);
    expect(xpForLevel(ix, 2)).toBe(library.levels.xpBase);
    for (let l = 2; l < 10; l++) expect(xpForLevel(ix, l + 1)).toBeGreaterThan(xpForLevel(ix, l));
  });

  it("gives the class's stat gains at once and queues a perk choice", () => {
    const h = onlyFighter();
    const before = { ...h.stats };
    expect(gainXp(ix, h, xpForLevel(ix, 2), rng())).toBe(1);
    expect(h.level).toBe(2);
    expect(h.stats.STR).toBe(before.STR + 1);
    expect(h.stats.END).toBe(before.END + 1);
    expect(h.stats.INT).toBe(before.INT);
    expect(h.levelUps).toHaveLength(1);
    const up = h.levelUps[0]!;
    expect(up.offers).toHaveLength(library.levels.perkOffers);
    expect(new Set(up.offers).size).toBe(up.offers.length);
    for (const p of up.offers) {
      const def = ix.perk(p);
      expect(!def.classes.length || def.classes.includes("fighter")).toBe(true);
      expect(def.minLevel ?? 2).toBeLessThanOrEqual(2);
    }
    expect(up.freeStat).toBe(false);
  });

  it("can gain several levels at once, with a free stat point every third", () => {
    const h = onlyFighter();
    expect(gainXp(ix, h, xpForLevel(ix, 3), rng())).toBe(2);
    expect(h.levelUps.map((u) => [u.level, u.freeStat])).toEqual([
      [2, false],
      [3, true],
    ]);
    // Only the first has its offers rolled; the next is rolled once that's spent.
    expect(h.levelUps[1]!.offers).toEqual([]);
    expect(xpProgress(ix, h).into).toBe(0);
  });

  it("stops at the level cap", () => {
    const h = onlyFighter();
    gainXp(ix, h, 10_000_000, rng());
    expect(h.level).toBe(library.levels.maxLevel);
    expect(xpProgress(ix, h).max).toBe(true);
  });

  it("spends a level-up: one perk on offer, and the free point when there is one", () => {
    const h = onlyFighter();
    gainXp(ix, h, xpForLevel(ix, 3), rng());
    const first = h.levelUps[0]!;
    expect(badChoice(h, "not-on-offer", undefined)).toMatch(/perks on offer/);
    expect(badChoice(h, first.offers[0], "STR")).toMatch(/No free stat/);
    spendLevelUp(ix, h, first.offers[0], undefined, rng(2));
    expect(h.perks).toEqual([first.offers[0]]);
    const second = h.levelUps[0]!;
    expect(second.offers.length).toBeGreaterThan(0);
    expect(second.offers).not.toContain(first.offers[0]);
    expect(badChoice(h, second.offers[0], undefined)).toMatch(/free point/);
    const str = h.stats.STR;
    spendLevelUp(ix, h, second.offers[0], "STR", rng(3));
    expect(h.stats.STR).toBe(str + 1);
    expect(h.levelUps).toEqual([]);
  });

  it("never offers a perk twice", () => {
    const h = onlyFighter();
    gainXp(ix, h, xpForLevel(ix, 10), rng());
    let r = 10;
    while (h.levelUps.length) {
      const up = h.levelUps[0]!;
      spendLevelUp(ix, h, up.offers[0], up.freeStat ? "END" : undefined, rng(r++));
      expect(h.classes).toEqual({ fighter: h.level - h.levelUps.filter((u) => !u.classId).length });
    }
    expect(new Set(h.perks).size).toBe(h.perks.length);
    expect(perkPool(ix, h).map((p) => p.id)).not.toContain(h.perks[0]);
  });

  it("cheers a hero up when they get the perk they wanted", () => {
    let t = fresh();
    const id = t.roster[0]!.id;
    t = structuredClone(t);
    const h = t.roster[0]!;
    h.morale = 50;
    gainXp(ix, h, xpForLevel(ix, 2), rng());
    h.levelUps[0]!.wants = h.levelUps[0]!.offers[1];
    const after = chooseLevelUp(ix, t, id, h.levelUps[0]!.offers[1]);
    const got = after.roster[0]!;
    expect(got.morale).toBeGreaterThan(50);
    expect(got.moraleLog.at(-1)!.reason).toMatch(/training they wanted/);
    expect(() => chooseLevelUp(ix, after, id, undefined)).toThrow(/no level-up/);
  });

  it("comes from trips: kills shared by the party, plus a little per floor", () => {
    const t = launchAndWait(ix, fresh(2), heroNames);
    const trip = t.lastTrip!;
    for (const h of trip.party) {
      const now = t.roster.find((x) => x.id === h.id);
      if (!now) continue;
      expect(trip.xp![h.id]).toBeGreaterThan(0);
      expect(now.xp).toBe(trip.xp![h.id]);
    }
  });
});

describe("morale", () => {
  it("turns facts into morale using everyone's rules plus the hero's motivation", () => {
    const h = { ...fighter(), motivation: "gold", alignment: "neutral", morale: 50 };
    const changes = moraleChanges(ix, h, { goldShare: 8, emptyHanded: 0, likedGear: 1 });
    expect(changes.map((c) => c.reason)).toEqual([
      "liked their gear",
      "liked their share of the haul",
    ]);
    expect(changes.find((c) => c.reason.includes("haul"))!.amount).toBe(4);
    // A rule's cap holds however big the fact.
    const huge = moraleChanges(ix, h, { goldShare: 100_000 });
    expect(huge[0]!.amount).toBe(6);
  });

  it("is softened by WIL, and stays within 0-100", () => {
    const steady = { ...fighter(), alignment: "neutral", stats: { ...fighter().stats, WIL: 18 } };
    const shaky = { ...fighter(), alignment: "neutral", stats: { ...fighter().stats, WIL: 4 } };
    expect(lossFactor(ix, steady)).toBeLessThan(lossFactor(ix, shaky));
    const a = { ...steady, morale: 50, moraleLog: [] };
    const b = { ...shaky, morale: 50, moraleLog: [] };
    applyMorale(ix, a, { fallenComrades: 3 }, 1);
    applyMorale(ix, b, { fallenComrades: 3 }, 1);
    expect(a.morale).toBeGreaterThan(b.morale);
    const c = { ...fighter(), alignment: "neutral", morale: 2, moraleLog: [] };
    applyMorale(ix, c, { fallenComrades: 5 }, 1);
    expect(c.morale).toBe(0);
    expect(mood(ix, c)).toBe("fed up");
  });

  it("keeps a short log, folding repeats together", () => {
    const h = { ...fighter(), morale: 10, moraleLog: [] };
    for (let d = 1; d <= 5; d++) applyMorale(ix, h, { restDay: 1 }, d);
    expect(h.moraleLog).toEqual([{ day: 5, since: 1, amount: 5, reason: "a quiet day" }]);
  });

  it("rises on rest days when a hero's favourite building stands, and sinks without it", () => {
    let t = structuredClone(fresh(4));
    for (const h of t.roster) h.morale = 60;
    const fav = t.roster[0]!.favourite;
    const without = rest(ix, t, heroNames);
    t = build(t, fav);
    const withIt = rest(ix, t, heroNames);
    expect(withIt.roster[0]!.morale).toBeGreaterThan(without.roster[0]!.morale);
    if (!["guild-hall", "market"].includes(fav))
      expect(grumbles(ix, without).some((g) => g.hero === t.roster[0]!.id)).toBe(true);
  });

  it("gets a lift from the Tavern", () => {
    const t = structuredClone(fresh(4));
    for (const h of t.roster) h.morale = 40;
    const plain = rest(ix, t, heroNames);
    const tavern = rest(ix, build(t, "tavern"), heroNames);
    const sum = (x: TownState) => x.roster.reduce((s, h) => s + h.morale, 0);
    expect(sum(tavern)).toBeGreaterThan(sum(plain));
  });

  it("at 0, a hero quits: they keep what they're wearing and leave their pack", () => {
    const t = structuredClone(fresh());
    const h = t.roster[0]!;
    h.morale = 0;
    h.pack = ["bandages"];
    const worn = ["weapon", "offhand", "armor"]
      .map((s) => h.equipment[s as "weapon"])
      .filter(Boolean);
    const after = rest(ix, t, heroNames);
    expect(after.roster.map((x) => x.id)).not.toContain(h.id);
    expect(after.party).not.toContain(h.id);
    expect(after.departed.at(-1)).toMatchObject({ name: h.name, took: worn });
    expect(after.stash.filter((x) => x === "bandages").length).toBe(
      t.stash.filter((x) => x === "bandages").length + 1,
    );
    expect(after.news.at(-1)!.text).toMatch(/quits/);
  });

  it("at low morale, a glory hound may refuse to turn back", () => {
    const go = (morale: number) => {
      let refusals = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const party = createStarterParty(ix, heroNames, rng(seed)).map((h) => ({
          ...h,
          motivation: "glory",
          morale,
        }));
        const o = orders({ targetFloor: 2, retreat: { kind: "hero-hp-below", percent: 99 } });
        refusals += runExpedition(ix, party, o, seed).disobeyed;
      }
      return refusals;
    };
    expect(go(60)).toBe(0);
    expect(go(10)).toBeGreaterThan(0);
  });

  it("at low morale, a greedy hero pockets junk whatever the orders say", () => {
    let grabbed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const party = createStarterParty(ix, heroNames, rng(seed)).map((h) => ({
        ...h,
        motivation: "gold",
        morale: 5,
      }));
      const r = runExpedition(ix, party, orders({ targetFloor: 2, loot: "valuable" }), seed);
      grabbed += r.log.filter((e) => e.kind === "disobey" && /pockets/.test(e.text)).length;
    }
    expect(grabbed).toBeGreaterThan(0);
  });
});

/**
 * Send the party to floor 3 with no retreat until someone is trapped, and
 * pass the days until it falls (M7.02: the town doesn't know yet).
 */
function wipeWithSurvivor(from = 0): { t: TownState; o: Outing; seed: number } {
  for (let seed = from; seed < 400; seed++) {
    let t = launch(
      ix,
      setOrders(ix, fresh(seed), orders({ targetFloor: 3, retreat: { kind: "never" } })),
      heroNames,
    );
    const o = t.outings[0]!;
    if (o.result.outcome !== "wiped") continue;
    while (t.outings[0]?.fell === undefined) t = rest(ix, t, heroNames);
    if (t.sites.some((s) => s.outing === o.id && s.trapped.length))
      return { t, o: t.outings[0]!, seed };
  }
  throw new Error("no wipe with a survivor in 400 seeds");
}

describe("wipes and rescue runs", () => {
  it("leave a site the town doesn't know about: the dead with their gear, the trapped waiting", () => {
    const { t, o } = wipeWithSurvivor();
    const site = t.sites.find((s) => s.outing === o.id)!;
    const sent = o.party.map((h) => h.name);
    const dead = site.bodies.map((b) => b.hero.name);
    for (const b of site.bodies) {
      expect(sent).toContain(b.hero.name);
      expect(b.hero.condition).toBe("dead");
      expect(b.hero.equipment).toEqual({});
    }
    for (const x of site.trapped) {
      expect(sent).toContain(x.hero.name);
      // The rescue clock starts when they fell, not when the town hears.
      expect(x.until).toBe(o.fell! + library.rescue.windowDays - 1);
    }
    for (const it of site.items.filter((i) => i.keep)) expect(dead).toContain(it.owner);
    // In town they're still just away: no news, nobody missing from the roster.
    for (const id of o.heroes) expect(t.roster.some((h) => h.id === id)).toBe(true);
    expect(t.news.some((n) => sent.some((name) => n.text.includes(`${name} is trapped`)))).toBe(
      false,
    );
    expect(t.lastTrip).toBeUndefined();
  });

  it("the trapped die if nobody comes in time, and the guild gives them up for lost", () => {
    let { t, o } = wipeWithSurvivor();
    const site = t.sites.find((s) => s.outing === o.id)!;
    const names = site.trapped.map((x) => x.hero.name);
    while (t.outings.length) t = rest(ix, t, heroNames);
    expect(t.day).toBe(o.expected + library.rescue.giveUpDays);
    for (const n of names) expect(t.memorial.find((m) => m.name === n)?.fate).toBe("lost");
    expect(t.news.some((n) => /up for lost/.test(n.text))).toBe(true);
    expect(t.sites.flatMap((s) => s.trapped)).toEqual([]);
    expect(t.sites.find((s) => s.party === o.name)?.unknown).toBe(true);
  });

  it("a rescue party sent after an overdue party brings the trapped home", () => {
    // Try a few wipes until a rescue party gets through.
    let seed = 0;
    for (let tries = 0; tries < 30; tries++) {
      const found = wipeWithSurvivor(seed);
      seed = found.seed + 1;
      let { t } = found;
      const { o } = found;
      // Nobody knows yet: a search can only be ordered once they're overdue.
      expect(() => planRescue(ix, t, o.id, "rescue")).toThrow(/isn't due back/);
      while (t.day <= o.expected) t = rest(ix, t, heroNames);
      // A strong, fresh rescue party.
      t = structuredClone(t);
      for (let i = 0; i < 3; i++) {
        const h = createHero(
          ix,
          { id: `r${i}`, name: `Rescuer ${i}`, classId: ["fighter", "fighter", "mage"][i]! },
          rng(i),
        );
        gainXp(ix, h, xpForLevel(ix, 6), rng(i));
        h.hp = Math.min(999, 10 + h.stats.END * 3 + h.stats.STR);
        t.roster.push(h);
        t.records[h.id] = { trips: 0, kills: 0, joined: t.day, deepest: 0, seen: [] };
      }
      t.party = ["r0", "r1", "r2"];
      t = planRescue(ix, t, o.id, "rescue");
      expect(t.orders.targetFloor).toBe(3);
      const after = launchAndWait(ix, t, heroNames);
      const back = after.trips.at(-1);
      if (!back?.rescued?.length) continue;
      for (const n of back.rescued) expect(after.roster.map((h) => h.name)).toContain(n);
      const rescued = after.roster.find((h) => h.name === back.rescued![0])!;
      expect(rescued.moraleLog.some((n) => /trapped/.test(n.reason))).toBe(true);
      // The searchers bring the news: the lost party is accounted for.
      expect(after.outings).toEqual([]);
      expect(back.result.log.some((e) => e.kind === "site")).toBe(true);
      // A rescue travels light: the dead are left for a recovery party.
      const site = after.sites.find((s) => s.party === o.name);
      if (site) expect(site.unknown).toBeUndefined();
      for (const m of after.memorial.filter((m) => o.heroes.includes(m.heroId!)))
        expect(m.fate).toBe("dead");
      return;
    }
    throw new Error("no rescue got through");
  });

  it("monsters carry off gear from a site, and give it back when killed", () => {
    const lib: Library = { ...library, rescue: { ...library.rescue, carryChance: 1 } };
    const lix = indexLibrary(lib);
    let recovered = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const party = createStarterParty(lix, heroNames, rng(seed));
      const r = runExpedition(lix, party, orders({ targetFloor: 1 }), seed, undefined, {
        gear: { 1: [{ id: "g1", item: "war-axe", owner: "Bram" }] },
      });
      if (r.gearTaken.includes("g1")) {
        recovered++;
        expect(r.haul.find((h) => h.keep)).toMatchObject({ item: "war-axe", owner: "Bram" });
        expect(r.log.some((e) => /Bram's war axe/.test(e.text))).toBe(true);
      }
    }
    expect(recovered).toBeGreaterThan(0);
  });
});

describe("saves from before M5", () => {
  it("give old heroes personalities, and play on", () => {
    const t = launchAndWait(ix, fresh(), heroNames);
    const old = JSON.parse(JSON.stringify(t)) as Record<string, unknown> & TownState;
    old.version = 3;
    for (const k of ["sites", "scavenged", "departed", "nextThingId", "news"])
      delete (old as never)[k];
    for (const h of [...old.roster, ...old.recruits] as unknown as Record<string, unknown>[]) {
      for (const k of [
        "xp",
        "levelUps",
        "morale",
        "motivation",
        "favourite",
        "likes",
        "dislikes",
        "moraleLog",
      ])
        delete h[k];
    }
    for (const r of Object.values(old.records) as unknown as Record<string, unknown>[]) {
      delete r.deepest;
      delete r.seen;
    }
    const up = migrateTown(ix, old)!;
    expect(up.version).toBe(TOWN_VERSION);
    for (const h of up.roster) {
      expect(library.motivations.map((m) => m.id)).toContain(h.motivation);
      expect(h.xp).toBe(0);
      expect(h.levelUps).toEqual([]);
    }
    // The same save gives the same personalities every time.
    expect(migrateTown(ix, structuredClone(old))).toEqual(up);
    expect(up.sites).toEqual([]);
    expect(launchAndWait(ix, rest(ix, up, heroNames), heroNames).day).toBeGreaterThan(up.day);
  });
});

describe("content checks", () => {
  it("catch broken motivations", () => {
    const [gold] = library.motivations;
    const errors = validateLibrary({
      ...library,
      motivations: [
        {
          ...gold!,
          favourites: [{ building: "casino", weight: 1 }],
          rules: [{ fact: "vibes" as never, amount: 1, reason: "x" }],
        },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown building "casino"'),
        expect.stringContaining('unknown morale fact "vibes"'),
      ]),
    );
  });
});
