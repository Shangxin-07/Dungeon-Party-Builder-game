/**
 * Renown and blessings (M8.19, DESIGN.md §20): the guild's name, what each
 * rank brings, and the blessing every holding gateway gives the town.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { StoneSeal } from "./dungeon";
import { indexLibrary } from "./library";
import { importSave } from "./save";
import {
  autoStart,
  boundSeals,
  contractReward,
  defence,
  deliverContract,
  fence,
  gainRenown,
  healingBonus,
  newTown,
  recruitPicks,
  recruitsToday,
  renownRank,
  rest,
  riseDays,
  takeContract,
  type TownState,
} from "./town";
import { noteShards } from "./town/shards";
import type { ExpeditionResult } from "./expedition";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const deeds = library.renown.deeds;

const gate = (stone: string, over: Partial<StoneSeal> = {}): StoneSeal => ({
  stone,
  day: 1,
  setting: "shut",
  strain: 0,
  level: 1,
  damaged: false,
  ...over,
});
const CLEANSED = "seal-stone-diggings-cleansed";
const BOUND = "seal-stone-warrens-bound";

const withStones = (t: TownState, stones: Record<number, StoneSeal>): TownState => ({
  ...t,
  dungeon: { ...t.dungeon, stones },
});

describe("renown", () => {
  it("starts at nothing, and ranks rise with it", () => {
    const t = fresh();
    expect(t.renown).toBe(0);
    expect(renownRank(ix, 0).rank.name).toBe("Unknown");
    expect(renownRank(ix, 0).next?.at).toBe(10);
    expect(renownRank(ix, 47).rank.name).toBe("Famous");
    expect(renownRank(ix, 999).next).toBeUndefined();
  });

  it("grows with deeds, says so on a new rank, and a breach takes some away", () => {
    const t = fresh();
    gainRenown(ix, t, "shard", 3);
    expect(t.renown).toBe(3 * deeds.shard);
    gainRenown(ix, t, "stone");
    expect(t.renown).toBe(3 * deeds.shard + deeds.stone);
    expect(t.news.some((n) => /known in the valley/.test(n.text))).toBe(true);
    gainRenown(ix, t, "breach", 100);
    expect(t.renown).toBe(0);
  });

  it("counts shards when they come home, not before", () => {
    const t = fresh();
    const result = { shards: ["diggings-bearer", "not-a-shard"] } as unknown as ExpeditionResult;
    noteShards(ix, t, result, false);
    expect(t.renown).toBe(0);
    noteShards(ix, t, result, true);
    expect(t.renown).toBe(deeds.shard);
  });

  it("brings better and more recruits, rank by rank", () => {
    const t = fresh();
    const picks = recruitPicks(ix, t);
    const offers = recruitsToday(ix, t);
    expect(recruitPicks(ix, { ...t, renown: 10 })).toBe(picks + 1);
    expect(recruitsToday(ix, { ...t, renown: 25 })).toBe(offers + 1);
    expect(recruitPicks(ix, { ...t, renown: 70 })).toBe(picks + 2);
  });

  it("makes contracts pay more once the guild is famous", () => {
    const t = fresh();
    expect(contractReward(ix, t, 100)).toBe(100);
    expect(contractReward(ix, { ...t, renown: 45 }, 100)).toBe(120);
    let s: TownState = {
      ...t,
      renown: 45,
      gold: 0,
      materials: { "iron-ore": 6 },
      offers: [{ id: "xt", def: "ore-contract", day: t.day, until: t.day + 3 }],
    };
    s = takeContract(ix, s, "xt");
    s = deliverContract(ix, s, "xt");
    const reward = library.offers.find((o) => o.id === "ore-contract")!;
    expect(s.gold).toBe(
      contractReward(ix, { ...t, renown: 45 }, (reward as { reward: number }).reward),
    );
    expect(s.renown).toBe(45 + deeds.contract);
  });

  it("is worked out for an old save from what it had already done", () => {
    const t = fresh();
    const old = structuredClone(t) as unknown as Record<string, unknown>;
    delete old.renown;
    old.version = 21;
    old.shards = { "diggings-bearer": { found: 3 }, "diggings-cache": { points: 2 } };
    old.dungeon = { ...(old.dungeon as object), stones: { 1: gate(CLEANSED) } };
    old.lairs = { "mire-wallow": { slain: 4 } };
    const back = importSave(
      ix,
      JSON.stringify({ game: "dungeon-party-builder", version: 21, savedAt: "", town: old }),
    );
    expect(back.renown).toBe(deeds.shard + deeds.stone + deeds.lair);
  });
});

describe("blessings", () => {
  it("a cleansed gateway heals faster and keeps the dead down longer", () => {
    const t = fresh();
    const b = withStones(t, { 1: gate(CLEANSED) });
    expect(healingBonus(ix, b)).toBe(healingBonus(ix, t) + 0.5);
    expect(riseDays(ix, b)).toBe(riseDays(ix, t) + 3);
    expect(boundSeals(ix, b)).toBe(0);
  });

  it("a bound gateway pays more for hauls and scares off what climbs out", () => {
    const t = fresh();
    const b = withStones(t, { 2: gate(BOUND) });
    expect(fence(ix, b)).toBe(fence(ix, t) + 5);
    expect(defence(ix, b)).toBe(defence(ix, t) + 4);
    expect(boundSeals(ix, b)).toBe(1);
  });

  it("add up seal by seal, and a breached gateway gives nothing", () => {
    const t = fresh();
    const two = withStones(t, { 1: gate(CLEANSED), 2: gate("seal-stone-warrens-cleansed") });
    expect(healingBonus(ix, two)).toBe(healingBonus(ix, t) + 1);
    const broken = withStones(t, { 2: gate(BOUND, { damaged: true }) });
    expect(fence(ix, broken)).toBe(fence(ix, t));
    expect(boundSeals(ix, broken)).toBe(0);
  });

  it("weighs on Good heroes while a bound stone holds", () => {
    const t = fresh();
    const good = t.roster.find((h) => h.alignment === "good") ?? t.roster[0]!;
    const plain = {
      ...t,
      roster: t.roster.map((h) => (h.id === good.id ? { ...h, alignment: "good", morale: 50 } : h)),
    };
    const a = rest(ix, plain, heroNames).roster.find((h) => h.id === good.id)!;
    const b = rest(ix, withStones(plain, { 2: gate(BOUND) }), heroNames).roster.find(
      (h) => h.id === good.id,
    )!;
    expect(b.morale).toBeLessThan(a.morale);
  });
});
