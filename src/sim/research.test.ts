/**
 * Research at the Library (M7.07, DESIGN.md §17.7): researchers at desks,
 * monster tiers and what they do in a fight, wards, specimens and finds on
 * the shelf, and the debrief's research choice.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { runCombat } from "./combat";
import { runExpedition } from "./expedition";
import { createHero, type Hero } from "./hero";
import { gainXp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { scoutingReport } from "./report";
import { createRng } from "./rng";
import {
  assignDesk,
  assignPost,
  autoStart,
  launchAndWait,
  monsterTier,
  newTown,
  researchPlan,
  researchTiers,
  researchTopics,
  rest,
  settleHaul,
  studyRate,
  TownError,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const withLibrary = (t: TownState, level = 1): TownState => ({
  ...t,
  buildings: { ...t.buildings, library: level },
});
/** A town whose guild has met these monsters. */
const met = (t: TownState, ids: string[]): TownState => {
  const id = t.roster[0]!.id;
  return { ...t, records: { ...t.records, [id]: { ...t.records[id]!, seen: ids } } };
};
const hero = (classId: string, over: Partial<Hero> = {}, seed = 3): Hero => ({
  ...createHero(
    ix,
    { id: `x-${classId}-${seed}`, name: `${classId} ${seed}`, classId },
    createRng(seed),
  ),
  ...over,
});

describe("researchers", () => {
  it("need a Library, which has 2 desks, then 4", () => {
    const t = fresh();
    const [a, b, c] = t.roster;
    expect(() => assignDesk(ix, t, a!.id)).toThrow(/needs a Library/);
    let l = withLibrary(t);
    l = assignDesk(ix, l, a!.id);
    l = assignDesk(ix, l, b!.id);
    expect(() => assignDesk(ix, l, c!.id)).toThrow(TownError);
    expect(assignDesk(ix, withLibrary(l, 2), c!.id).research.desks).toHaveLength(3);
    // And leave again.
    expect(assignDesk(ix, l, a!.id, undefined, true).research.desks.map((d) => d.hero)).toEqual([
      b!.id,
    ]);
  });

  it("study faster with more INT, and faster still if they're in it for knowledge", () => {
    const dull = hero("fighter", { stats: { ...hero("fighter").stats, INT: 8, PER: 8 } });
    const sharp = hero("mage", { stats: { ...hero("mage").stats, INT: 18, PER: 14 } });
    expect(studyRate(ix, sharp)).toBeGreaterThan(studyRate(ix, dull) * 2);
    const keen = { ...sharp, motivation: "knowledge" };
    const other = { ...sharp, motivation: "glory" };
    expect(studyRate(ix, keen)).toBeGreaterThan(studyRate(ix, other));
  });

  it("are on one job at a time: a desk or a post", () => {
    let t = withLibrary(fresh());
    const id = t.roster[0]!.id;
    t = assignPost(ix, t, id, "lookout");
    t = assignDesk(ix, t, id);
    expect(Object.values(t.posts).flat()).not.toContain(id);
    t = assignPost(ix, t, id, "lookout");
    expect(t.research.desks).toEqual([]);
  });

  it("put in points every day, earn XP, and Study a monster the guild has met", () => {
    let t = met(withLibrary(fresh()), ["goblin"]);
    const h = t.roster[0]!;
    t = assignDesk(ix, t, h.id, "monster:goblin");
    const xp = h.xp;
    const rate = studyRate(ix, h);
    t = rest(ix, t, heroNames);
    expect(t.research.monsters.goblin).toBeCloseTo(rate, 5);
    expect(t.roster.find((x) => x.id === h.id)!.xp).toBeGreaterThan(xp);
    expect(monsterTier(ix, t, "goblin")).toBe(1);
    for (let d = 0; d < 20 && monsterTier(ix, t, "goblin") < 2; d++) t = rest(ix, t, heroNames);
    expect(monsterTier(ix, t, "goblin")).toBe(2);
    expect(t.news.some((n) => /studied the Goblin/.test(n.text))).toBe(true);
    expect(researchTiers(ix, t)).toEqual({ goblin: 2 });
  });

  it("with no topic set, take the one nearest done", () => {
    let t = met(withLibrary(fresh()), ["goblin", "cave-troll"]);
    t = { ...t, research: { ...t.research, monsters: { "cave-troll": 90 } } };
    t = assignDesk(ix, t, t.roster[0]!.id);
    t = rest(ix, t, heroNames);
    expect(t.research.monsters["cave-troll"]).toBeGreaterThan(90);
    expect(t.research.monsters.goblin).toBeUndefined();
  });

  it("can only study what the guild has met", () => {
    const t = withLibrary(fresh());
    expect(researchTopics(ix, t)).toEqual([]);
    expect(() => assignDesk(ix, t, t.roster[0]!.id, "monster:cave-troll")).toThrow(TownError);
  });
});

describe("kills", () => {
  it("teach the Library a point each when the party is home", () => {
    const t = launchAndWait(ix, fresh(2), heroNames);
    const kills = t.lastTrip!.result.kills;
    expect(kills.length).toBeGreaterThan(0);
    const total = Object.values(t.research.monsters).reduce((a, b) => a + b, 0);
    expect(total).toBe(kills.length * library.research.killPoints);
  });
});

describe("in a fight", () => {
  const party = () => [hero("fighter", {}, 1), hero("fighter", {}, 2), hero("scout", {}, 3)];
  /** The party's first blow on a troll in each of 60 fights: the same roll, with and without research. */
  const firstBlows = (research?: Record<string, number>) => {
    let sum = 0;
    for (let seed = 0; seed < 60; seed++) {
      const r = runCombat(ix, party(), ["cave-troll"], { seed, maxRounds: 1, research });
      const troll = r.fighters.find((f) => f.monsterId === "cave-troll")!.uid;
      sum += r.log.find((e) => e.kind === "damage" && e.target === troll)?.amount ?? 0;
    }
    return sum;
  };

  it("a Studied monster takes more damage, a Mastered one more again", () => {
    const none = firstBlows();
    const studied = firstBlows({ "cave-troll": 2 });
    const mastered = firstBlows({ "cave-troll": 3 });
    expect(studied).toBeGreaterThan(none * 1.1);
    expect(mastered).toBeGreaterThan(studied);
  });

  it("a ward can't be hurt until it's researched, and the party runs", () => {
    const r = runCombat(ix, party(), ["foremans-shade"], { seed: 4, level: 5 });
    expect(r.fled).toBe("foremans-shade");
    expect(r.winner).not.toBe("party");
    const shade = r.fighters.find((f) => f.monsterId === "foremans-shade")!;
    expect(shade.hp).toBe(shade.derived.maxHp);
    expect(r.log.some((e) => /bound to the last shift/.test(e.text))).toBe(true);
    // Once the Library has Studied it, blows land.
    const hits = runCombat(ix, party(), ["foremans-shade"], {
      seed: 4,
      level: 5,
      research: { "foremans-shade": 2 },
    });
    expect(hits.fled).toBeUndefined();
    const after = hits.fighters.find((f) => f.monsterId === "foremans-shade")!;
    expect(after.hp).toBeLessThan(after.derived.maxHp);
  });

  it("the party goes for what it can hurt first", () => {
    const r = runCombat(ix, party(), ["foremans-shade", "lost-delver"], { seed: 2, level: 5 });
    const delver = r.fighters.find((f) => f.monsterId === "lost-delver")!;
    // The delver is in the back row, out of reach of blades while the shade stands,
    // but the bow and anything ranged go for it.
    expect(r.log.some((e) => e.kind === "damage" && e.target === delver.uid)).toBe(true);
  });

  it("a party that meets a warded monster on a trip runs, and turns for home", () => {
    // Veterans, taken down past the top floors by the Mine Cage.
    const heroes = ["fighter", "cleric", "scout", "fighter"].map((c, i) => {
      const h = hero(c, {}, i + 1);
      gainXp(ix, h, xpForLevel(ix, 8), createRng(i));
      h.hp = 999;
      return h;
    });
    let found = 0;
    for (let seed = 0; seed < 300 && found < 3; seed++) {
      const r = runExpedition(
        ix,
        heroes,
        { targetFloor: 5, retreat: { kind: "never" }, loot: "everything" },
        seed,
        undefined,
        { lift: 4 },
      );
      const ran = r.log.findIndex((e) => /They run for it/.test(e.text));
      if (ran < 0) continue;
      found++;
      expect(r.outcome).not.toBe("returned");
      if (r.outcome === "retreated")
        expect(
          r.log.some((e) => /can hurt The Foreman's Shade. The party heads for home/.test(e.text)),
        ).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe("the scouting report", () => {
  it("warns about a ward, and names a Studied monster's tricks", () => {
    const t = met(
      fresh(),
      library.monsters.map((m) => m.id),
    );
    const r = scoutingReport(ix, t, 5, [hero("fighter")]);
    expect(r.warnings.join(" ")).toMatch(/can hurt The Foreman's Shade/);
    const studied = {
      ...t,
      research: { monsters: { "foremans-shade": 999, "lost-delver": 999 }, shelf: [], desks: [] },
    };
    const s = scoutingReport(ix, studied, 5, [hero("fighter")]);
    expect(s.warnings.join(" ")).not.toMatch(/can hurt The Foreman's Shade/);
    const delver = s.monsters.find((m) => m.monster === "lost-delver")!;
    expect(delver.tricks).toMatch(/Holy light/);
    expect(delver.weakTo).toContain("holy");
    expect(r.monsters.find((m) => m.monster === "lost-delver")!.tricks).toBeUndefined();
  });
});

describe("the debrief", () => {
  const haul = (t: TownState, items: string[]): TownState => ({
    ...t,
    haul: items.map((item, i) => ({
      id: `l${900 + i}`,
      item,
      value: ix.item(item).value,
      estimate: ix.item(item).value,
      keep: false,
      from: "test",
      day: t.day,
    })),
  });

  it("can't send anything to the Library before it's built", () => {
    const t = haul(fresh(), ["goblin-ear"]);
    expect(() => settleHaul(ix, t, { l900: "research" })).toThrow(/needs a Library/);
  });

  it("feeds specimens to their monsters' research at once", () => {
    const t = settleHaul(ix, haul(withLibrary(fresh()), ["goblin-ear"]), { l900: "research" });
    expect(t.haul).toEqual([]);
    expect(t.research.monsters).toMatchObject({ goblin: 6, "goblin-archer": 6, "goblin-boss": 6 });
    expect(t.news.at(-1)!.text).toMatch(/sent goblin's ear to the Library/);
  });

  it("puts strange trinkets on the shelf, and a researcher works out what they are", () => {
    let t = haul(withLibrary(fresh()), ["trinket", "rusty-helmet"]);
    const plan = researchPlan(ix, t);
    expect(plan).toEqual({ l900: "research", l901: "sell" });
    t = settleHaul(ix, t, plan);
    expect(t.research.shelf.map((s) => s.item)).toEqual(["trinket"]);
    expect(researchTopics(ix, t)[0]!.id).toMatch(/^shelf:/);
    const stash = t.stash.length;
    t = assignDesk(ix, t, t.roster[0]!.id);
    for (let d = 0; d < 10 && t.research.shelf.length; d++) t = rest(ix, t, heroNames);
    expect(t.research.shelf).toEqual([]);
    expect(t.stash.length).toBe(stash + 1);
    const found = t.stash.at(-1)!;
    expect(
      library.lootTables.find((l) => l.id === "trinket-identified")!.entries.map((e) => e.item),
    ).toContain(found);
    expect(t.news.some((n) => /worked out the strange trinket/.test(n.text))).toBe(true);
  });
});
