/**
 * Sneak missions and the Mire Behemoth (M7.08, DESIGN.md §17.8): Stealth
 * goes by the party's loudest member, scouts find lairs, a sneak party
 * fetches shed scales unheard, research breaks the ward and unlocks the bane.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, heroSheet, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { missingContent } from "./save";
import { hearingOf, knownLairs, partyStealth, sneakChance } from "./stealth";
import { validateLibrary } from "./validate";
import {
  autoStart,
  cantLaunch,
  launch,
  newTown,
  setOrders,
  shopStock,
  waitUntilBack,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
const orders = (o: Partial<StandingOrders>): StandingOrders => ({
  targetFloor: 1,
  retreat: { kind: "hero-hp-below", percent: 30 },
  loot: "everything",
  ...o,
});
// Strong enough to walk floor 4 and come home.
const tough = (seed = 1): Hero[] =>
  createStarterParty(ix, heroNames, createRng(seed)).map((h) => ({
    ...h,
    stats: { ...h.stats, STR: 30, END: 30, DEX: 30, PER: 20 },
    hp: 999,
  }));

describe("stealth", () => {
  it("goes by the loudest hero, and noisy gear and big parties make it worse", () => {
    const p = createStarterParty(ix, heroNames, createRng(1));
    const worst = Math.min(...p.map((h) => heroSheet(ix, h).skills.stealth ?? 0));
    const q = partyStealth(ix, p);
    expect(q.value).toBe(worst - ix.lib.stealth.perExtraHero * (p.length - 2));
    const clanking = p.map((h, i) =>
      i ? h : { ...h, equipment: { ...h.equipment, armor: "scale-mail" } },
    );
    expect(heroSheet(ix, clanking[0]!).skills.stealth).toBeLessThan(
      heroSheet(ix, p[0]!).skills.stealth!,
    );
    expect(ix.item("scale-mail").tags).toContain("noisy");
  });

  it("the Behemoth is nearly deaf", () => {
    expect(hearingOf(ix, "mire-behemoth")).toBeLessThan(hearingOf(ix, "goblin") - 30);
    expect(sneakChance(ix, 30, ["mire-behemoth"])).toBeGreaterThan(sneakChance(ix, 30, ["goblin"]));
  });

  it("content checks out", () => {
    expect(validateLibrary(library)).toEqual([]);
  });
});

describe("the Mire Behemoth's wallow", () => {
  it("never turns up on an ordinary trip", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = runExpedition(ix, tough(seed), orders({ targetFloor: 4 }), seed);
      expect(r.lair).toBeUndefined();
      expect(r.seen).not.toContain("mire-behemoth");
    }
  });

  it("scouts find it halfway along floor 4, and glimpse the beast", () => {
    const r = runExpedition(ix, tough(2), orders({ targetFloor: 4, mission: "scout" }), 2);
    expect(r.outcome).not.toBe("wiped");
    const four = r.intel!.find((i) => i.floor === 4)!;
    expect(four.lairs).toEqual(["mire-wallow"]);
    expect(r.intel!.find((i) => i.floor === 3)!.lairs).toEqual([]);
    expect(r.seen).toContain("mire-behemoth");
  });

  it("a sneak party fetches scales unheard, or is heard and has to run", () => {
    const outcomes = new Set<string>();
    let scales = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(
        ix,
        tough(seed),
        orders({ targetFloor: 4, mission: "sneak", lair: "mire-wallow" }),
        seed,
      );
      if (r.outcome === "wiped") continue;
      expect(r.huntRooms).toBe(0);
      expect(r.sneaked!.past + r.sneaked!.heard).toBeGreaterThan(0);
      outcomes.add(r.lair!.outcome);
      // Heard by something nothing can hurt: the party runs.
      if (r.lair!.outcome !== "fetched") expect(r.lair!.outcome).toBe("fled");
      scales += r.haul.filter((h) => h.item === "shed-scale").length;
    }
    expect(outcomes.has("fetched")).toBe(true);
    expect(scales).toBeGreaterThan(0);
  });

  it("a delve party sent for it runs until the Library has Studied it, then can kill it", () => {
    const o = orders({ targetFloor: 4, lair: "mire-wallow" });
    const r = runExpedition(ix, tough(3), o, 3);
    expect(r.lair?.outcome).toBe("fled");
    expect(r.outcome).toBe("retreated");
    let slain = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const party = tough(seed).map((h) =>
        h.row === "front" ? { ...h, equipment: { ...h.equipment, weapon: "scale-piercer" } } : h,
      );
      const k = runExpedition(ix, party, o, seed, undefined, { research: { "mire-behemoth": 2 } });
      if (k.lair?.outcome === "slain") {
        slain++;
        expect(k.kills).toContain("mire-behemoth");
      }
    }
    expect(slain).toBeGreaterThan(0);
  });
});

describe("in town", () => {
  const knowing = (): TownState => ({
    ...fresh(),
    intel: {
      4: {
        floor: 4,
        hour: 30,
        day: 2,
        by: "Scouts",
        level: 4,
        population: 70,
        monsters: {},
        groups: 0,
        slipped: 0,
        features: [],
        hazards: [],
        rooms: 4,
        of: 7,
        lairs: ["mire-wallow"],
      },
    },
  });

  it("a sneak party needs a lair the scouts found, on its floor", () => {
    const t0 = fresh();
    expect(cantLaunch(ix, setOrders(ix, t0, orders({ mission: "sneak" })))).toMatch(/Pick a lair/);
    expect(
      cantLaunch(
        ix,
        setOrders(ix, t0, orders({ targetFloor: 4, mission: "sneak", lair: "mire-wallow" })),
      ),
    ).toMatch(/Send scouts/);
    const t = knowing();
    expect(knownLairs(ix, t).map((l) => l.id)).toEqual(["mire-wallow"]);
    expect(
      cantLaunch(
        ix,
        setOrders(ix, t, orders({ targetFloor: 3, mission: "sneak", lair: "mire-wallow" })),
      ),
    ).toMatch(/floor 4/);
    const ok = setOrders(ix, t, orders({ targetFloor: 4, mission: "sneak", lair: "mire-wallow" }));
    expect(cantLaunch(ix, ok)).toBeUndefined();
    expect(missingContent(ix, ok)).toEqual([]);
    const sent = launch(ix, ok, heroNames);
    expect(sent.orders.mission).toBeUndefined();
    expect(sent.orders.lair).toBeUndefined();
    expect(sent.news.at(-1)!.text).toMatch(/to sneak into the Mire Behemoth's Wallow/);
  });

  it("the Blacksmith forges the bane once the Behemoth is Studied", () => {
    const t = { ...fresh(), buildings: { ...fresh().buildings, blacksmith: 1 } };
    const withBane: TownState = {
      ...t,
      research: { ...t.research, monsters: { "mire-behemoth": 80 } },
    };
    expect(shopStock(ix, t)).not.toContain("scale-piercer");
    expect(shopStock(ix, withBane)).toContain("scale-piercer");
  });

  it("killing the beast quiets floor 4 and empties the wallow for good", () => {
    let t = knowing();
    t = { ...t, research: { ...t.research, monsters: { "mire-behemoth": 240 } } };
    // Swap in a party that can do it.
    const strong = tough(5).map((h) => ({
      ...h,
      equipment: { ...h.equipment, weapon: "scale-piercer" },
    }));
    const ids = t.party;
    t = {
      ...t,
      roster: t.roster.map((h) => {
        const i = ids.indexOf(h.id);
        return i >= 0 && strong[i] ? { ...strong[i]!, id: h.id, name: h.name } : h;
      }),
    };
    t = setOrders(ix, t, orders({ targetFloor: 4, lair: "mire-wallow" }));
    const before = t.dungeon.floors[3]!.population;
    const sent = launch(ix, t, heroNames);
    const r = sent.outings[0]!.result;
    const back = waitUntilBack(ix, sent, heroNames, 60);
    if (r.lair?.outcome === "slain" && r.outcome !== "wiped" && r.outcome !== "holed") {
      expect(back.lairs?.["mire-wallow"]?.slain).toBeDefined();
      expect(back.dungeon.floors[3]!.population).toBeLessThan(before);
      expect(back.news.some((n) => /killed the Mire Behemoth/.test(n.text))).toBe(true);
      const again = runExpedition(
        ix,
        tough(6),
        orders({ targetFloor: 4, lair: "mire-wallow" }),
        6,
        undefined,
        { slainLairs: ["mire-wallow"] },
      );
      expect(again.lair?.outcome).toBe("empty");
    } else {
      expect.fail(`expected the strong party to kill it, got ${r.lair?.outcome} / ${r.outcome}`);
    }
  });
});
