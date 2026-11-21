/**
 * M6.23: alignment in the dungeon and in town (DESIGN.md §7). Room events
 * played out by party alignment, monsters that react to it, holy and unholy
 * gear, and the Black Market.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library, MonsterDef } from "../content/types";
import { runCombat } from "./combat";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { moraleChanges } from "./morale";
import { createRng } from "./rng";
import {
  autoStart,
  fence,
  haulPrice,
  launch,
  launchWarnings,
  newTown,
  shopStock,
  willDeal,
  type TownState,
} from "./town";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({
  ...DEFAULT_ORDERS,
  retreat: { kind: "never" },
  ...o,
});
/** A party of one alignment that nothing on floor 1 can hurt much. */
const party = (alignment: string, seed = 1): Hero[] =>
  createStarterParty(ix, heroNames, createRng(seed)).map((h) => ({
    ...h,
    alignment,
    stats: { ...h.stats, STR: 30, END: 30, DEX: 30 },
    hp: 999,
  }));

/** The real library, but every room is an event room with only this event. */
function eventsOnly(eventId: string): Library {
  const room = library.rooms.find((r) => r.behaviour === "event")!;
  const rest = library.rooms.filter((r) => r.behaviour === "rest");
  return {
    ...library,
    rooms: [room, ...rest],
    events: library.events.filter((e) => e.id === eventId),
  };
}

describe("room events (DESIGN.md §7)", () => {
  it("the content is valid", () => {
    expect(validateLibrary(library)).toEqual([]);
    expect(library.events.length).toBeGreaterThanOrEqual(4);
  });

  it("play out by the party's alignment: the wounded stranger", () => {
    const lib = eventsOnly("wounded-stranger");
    const ex = indexLibrary(lib);
    const run = (a: string) => runExpedition(ex, party(a), orders(), 3);
    const good = run("good");
    expect(good.deeds?.goodDeeds).toBeGreaterThan(0);
    expect(good.deeds?.evilDeeds).toBe(0);
    expect(good.log.some((e) => e.kind === "event" && /binds the miner/.test(e.text))).toBe(true);

    const neutral = run("neutral");
    expect(neutral.deeds).toEqual({ goodDeeds: 0, evilDeeds: 0 });
    expect(neutral.haul).toEqual([]);

    const evil = run("evil");
    expect(evil.deeds?.evilDeeds).toBeGreaterThan(0);
    expect(evil.haul.length).toBeGreaterThan(0);
    expect(evil.gifts).toEqual([]);
  });

  it("a divided party argues and does nothing", () => {
    const ex = indexLibrary(eventsOnly("wounded-stranger"));
    const mixed = party("good").map((h, i) => ({
      ...h,
      alignment: ["good", "neutral", "evil"][i]!,
    }));
    const r = runExpedition(ex, mixed, orders(), 3);
    expect(r.deeds).toEqual({ goodDeeds: 0, evilDeeds: 0 });
    expect(r.log.some((e) => /can't agree/.test(e.text))).toBe(true);
  });

  it("a saved stranger's thanks reach the town as gold", () => {
    let found = false;
    for (let seed = 1; seed < 30 && !found; seed++) {
      const ex = indexLibrary(eventsOnly("wounded-stranger"));
      const t0 = autoStart(ex, newTown(ex, heroNames, seed));
      for (const h of t0.roster) {
        h.alignment = "good";
        h.hp = 999;
        h.stats = { ...h.stats, STR: 30, END: 30, DEX: 30 };
      }
      const t = launch(ex, { ...t0, orders: orders() }, heroNames);
      const gifts = t.lastTrip!.result.gifts ?? [];
      if (!gifts.length) continue;
      found = true;
      const got = t.ledger.filter((l) => l.kind === "gifts").reduce((s, l) => s + l.amount, 0);
      expect(got).toBe(gifts.reduce((s, g) => s + g.gold, 0));
      expect(t.news.some((n) => /sent \d+ gold/.test(n.text))).toBe(true);
    }
    expect(found).toBe(true);
  });

  it("Good heroes feel good about kind deeds and bad about vile ones; Evil the other way", () => {
    const [good] = party("good");
    const [evil] = party("evil");
    const sum = (h: Hero, facts: Record<string, number>) =>
      moraleChanges(ix, h, facts).reduce((s, c) => s + c.amount, 0);
    expect(sum(good!, { goodDeeds: 1 })).toBeGreaterThan(0);
    expect(sum(good!, { evilDeeds: 1 })).toBeLessThan(0);
    expect(sum(evil!, { evilDeeds: 1 })).toBeGreaterThan(0);
    expect(sum(evil!, { goodDeeds: 1 })).toBeLessThan(0);
  });
});

describe("monsters that react to alignment (DESIGN.md §7)", () => {
  it("the undead go for Good heroes first", () => {
    const heroes = party("neutral").map((h, i) => ({
      ...h,
      row: "front" as const,
      alignment: i === 0 ? "good" : "neutral",
    }));
    let onGood = 0;
    let onOthers = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runCombat(ix, heroes, ["skeleton", "skeleton"], { seed, maxRounds: 3 });
      const uids = new Map(r.fighters.map((f) => [f.uid, f]));
      for (const e of r.log) {
        if (!["action", "hit", "miss"].includes(e.kind) || !e.actor || !e.target) continue;
        const actor = uids.get(e.actor);
        if (actor?.monsterId !== "skeleton") continue;
        if (e.target === heroes[0]!.id) onGood++;
        else onOthers++;
      }
    }
    expect(onGood).toBeGreaterThan(0);
    expect(onOthers).toBe(0);
  });

  it("goblins may parley with an Evil party instead of fighting, never a Good one", () => {
    const sure: MonsterDef[] = library.monsters.map((m) =>
      m.id === "goblin"
        ? { ...m, reactions: [{ reaction: "parley", to: ["evil"], chance: 1 }] }
        : m,
    );
    const lib: Library = {
      ...library,
      monsters: sure,
      encounters: library.encounters.filter((e) => e.id === "goblin-band"),
    };
    const ex = indexLibrary(lib);
    const evil = runExpedition(ex, party("evil"), orders(), 5);
    expect(evil.parleys).toBeGreaterThan(0);
    expect(evil.log.some((e) => e.kind === "parley")).toBe(true);
    const good = runExpedition(ex, party("good"), orders(), 5);
    expect(good.parleys).toBe(0);
    expect(good.kills.length).toBeGreaterThan(0);
  });

  it("a toll takes the cheapest loot, or it's a fight", () => {
    const toll: MonsterDef[] = library.monsters.map((m) =>
      m.id === "goblin"
        ? { ...m, reactions: [{ reaction: "tribute", to: ["evil"], chance: 1 }] }
        : m,
    );
    const ex = indexLibrary({
      ...library,
      monsters: toll,
      encounters: library.encounters.filter((e) => e.id === "goblin-band"),
    });
    const lines: string[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(ex, party("evil", seed), orders(), seed);
      lines.push(...r.log.filter((e) => e.kind === "parley").map((e) => e.text));
    }
    expect(lines.some((l) => /hands over/.test(l))).toBe(true);
    // An empty-handed party has to fight.
    expect(lines.some((l) => /nothing worth giving/.test(l))).toBe(true);
  });
});

describe("holy and unholy gear (DESIGN.md §7)", () => {
  it("Good heroes hate carrying unholy gear; Evil heroes like it", () => {
    const [good] = party("good");
    const [evil] = party("evil");
    const sum = (h: Hero) =>
      moraleChanges(ix, h, { unholyGear: 1 }).reduce((s, c) => s + c.amount, 0);
    expect(sum(good!)).toBeLessThan(0);
    expect(sum(evil!)).toBeGreaterThan(0);
    for (const id of ["cursed-blade", "bone-charm"]) expect(ix.item(id).tags).toContain("unholy");
    for (const id of ["holy-symbol", "blessed-blade"]) expect(ix.item(id).tags).toContain("holy");
  });

  it("a Good hero sent down with a cursed blade gets a warning", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 2));
    const h = t.roster.find((x) => t.party.includes(x.id))!;
    h.alignment = "good";
    h.equipment.weapon = "cursed-blade";
    expect(launchWarnings(ix, t).some((w) => /hates carrying the Cursed Blade/.test(w))).toBe(true);
  });

  it("the Temple sells holy gear", () => {
    const t = autoStart(ix, newTown(ix, heroNames, 2));
    expect(shopStock(ix, t)).not.toContain("holy-symbol");
    expect(shopStock(ix, { ...t, buildings: { ...t.buildings, temple: 1 } })).toContain(
      "holy-symbol",
    );
  });
});

describe("the Black Market (DESIGN.md §7)", () => {
  const withMarket = (alignments: string[]): TownState => {
    const t = autoStart(ix, newTown(ix, heroNames, 4));
    t.buildings = { ...t.buildings, "black-market": 1 };
    t.roster.forEach((h, i) => (h.alignment = alignments[i % alignments.length]!));
    return t;
  };

  it("only deals with a guild that has an Evil hero", () => {
    const none = withMarket(["good", "neutral"]);
    expect(willDeal(ix, none, "black-market")).toBe(false);
    expect(fence(ix, none)).toBe(0);
    expect(shopStock(ix, none)).not.toContain("cursed-blade");

    const some = withMarket(["good", "evil"]);
    expect(willDeal(ix, some, "black-market")).toBe(true);
    expect(fence(ix, some)).toBeGreaterThan(0);
    expect(shopStock(ix, some)).toContain("cursed-blade");
  });

  it("fences the haul for more than the Market pays", () => {
    const some = withMarket(["evil"]);
    expect(haulPrice(ix, "gem", 100, 0, fence(ix, some))).toBeGreaterThan(
      haulPrice(ix, "gem", 100),
    );
    // Coins are coins.
    expect(haulPrice(ix, "coins", 10, 0, fence(ix, some))).toBe(10);
  });
});
