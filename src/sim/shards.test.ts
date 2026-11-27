/**
 * The Hearthstone's shards (DESIGN.md §20): a set per floor, deeper floors
 * needing more; shard-bearers met only by a party hunting a thinned floor,
 * and only fought by a seasoned one; shards hidden like caches; the
 * Library's finds; and shards coming home to the store room, or lying with
 * a lost party for the monsters to carry off.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library, ShardSetDef } from "../content/types";
import { newDungeon } from "./dungeon";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, heroSheet, type Hero } from "./hero";
import { chooseClass, gainXp, spendLevelUp, xpForLevel } from "./levels";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { shardsNeeded } from "./shards";
import {
  assignDesk,
  autoStart,
  launch,
  launchAndWait,
  newTown,
  openShards,
  researchTopics,
  rest,
  setOrders,
  shardProgress,
  type TownState,
} from "./town";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));

/** A party of four at this level, healed up. */
function party(level: number, seed: number): Hero[] {
  const rng = createRng(seed);
  const heroes = createStarterParty(ix, heroNames, rng, ["fighter", "fighter", "cleric", "mage"]);
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

/** The dungeon with floor 1 thinned down to this many monsters. */
function thinned(population: number) {
  const floors = newDungeon(ix).floors.map((f) => ({ ...f }));
  floors[0]!.population = population;
  return floors;
}

const hunt: StandingOrders = { ...DEFAULT_ORDERS, targetFloor: 1, clearPercent: 100 };
const shardLog = (log: readonly { kind: string; text: string }[]) =>
  log.filter((e) => e.kind === "shard").map((e) => e.text);

describe("shard sets", () => {
  it("check out, one per floor above the bottom", () => {
    expect(validateLibrary(library)).toEqual([]);
    const floors = library.shards.map((s) => s.floor).sort();
    expect(floors).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("need more shards deeper down (Mike: 3 for floors 1-3, 6 from floor 4)", () => {
    for (const f of [1, 2, 3]) expect(shardsNeeded(ix, f)).toBe(3);
    for (const f of [4, 5]) expect(shardsNeeded(ix, f)).toBe(6);
    // Floor 5's are the Coalstone's (M8.37), the stone under the Hearthstone.
    expect(library.shards.find((s) => s.floor === 5)!.stone).toBe("Coalstone");
  });

  it("put floor 1's out of a fresh guild's reach: two of its three need floor 2", () => {
    const set = library.shards.find((s) => s.floor === 1)!;
    const cache = set.shards.find((s) => s.kind === "cache")!;
    expect(cache.floor).toBe(2);
    const lib = set.shards.find((s) => s.kind === "library")!;
    expect(lib.kind === "library" && lib.monsters).toEqual(["spider-matriarch"]);
  });

  it("are refused when broken", () => {
    const bad: ShardSetDef = {
      id: "bad",
      floor: Math.max(...library.floors.map((f) => f.depth)),
      item: "iron-ore",
      shards: [
        {
          id: "bad-bearer",
          kind: "bearer",
          floor: 1,
          hint: "",
          monster: "nobody",
          below: 0.5,
          chance: 2,
          escort: 0,
          stand: 0,
          shows: "",
        },
      ],
      forge: { materials: {}, work: 1 },
      surge: { power: 1, text: "" },
    };
    const errors = validateLibrary({ ...library, shards: [...library.shards, bad] });
    expect(errors.join("\n")).toMatch(/bottom floor/);
    expect(errors.join("\n")).toMatch(/must be a material tagged "shard"/);
    expect(errors.join("\n")).toMatch(/unknown monster "nobody"/);
    expect(errors.join("\n")).toMatch(/chance must be/);
  });
});

describe("shard-bearers", () => {
  const all = ["diggings-bearer"];

  it("never meet a party just passing through", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(ix, party(5, seed), DEFAULT_ORDERS, seed, thinned(10), {
        shards: all,
      });
      expect(shardLog(r.log)).toEqual([]);
    }
  });

  it("keep to the back tunnels while the floor is crowded", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(
        ix,
        party(5, seed),
        { ...hunt, clearPercent: 10 },
        seed,
        thinned(38),
        {
          shards: all,
        },
      );
      expect(r.log.some((e) => /Skrag/.test(e.text))).toBe(false);
    }
  });

  it("come out to a party hunting a thinned floor; a seasoned party kills it and takes the shard", () => {
    let met = 0;
    let taken = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runExpedition(ix, party(5, seed), hunt, seed, thinned(15), { shards: all });
      if (shardLog(r.log).some((t) => /Skrag Shardcrown shoulders/.test(t))) met++;
      if (!r.shards?.includes("diggings-bearer")) continue;
      taken++;
      expect(r.kills).toContain("skrag-shardcrown");
      const shard = [...r.haul, ...r.leftBehind].find((h) => h.item === "shard-diggings");
      expect(shard?.keep).toBe(true);
    }
    expect(met).toBeGreaterThan(5);
    expect(taken).toBeGreaterThan(3);
  });

  it("are too much for a fresh party, which backs off instead of fighting", () => {
    let backed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runExpedition(ix, party(1, seed), hunt, seed, thinned(15), { shards: all });
      expect(r.shards).toBeUndefined();
      expect(r.kills).not.toContain("skrag-shardcrown");
      if (shardLog(r.log).some((t) => /calls the party back/.test(t))) {
        backed++;
        // Now the guild knows what carries it.
        expect(r.seen).toContain("skrag-shardcrown");
      }
    }
    expect(backed).toBeGreaterThan(3);
  });

  it("don't come out once their shard is found", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(ix, party(5, seed), hunt, seed, thinned(15), { shards: [] });
      expect(r.kills).not.toContain("skrag-shardcrown");
    }
  });
});

describe("shards hidden like caches", () => {
  // A made-up cache on floor 1 that a party always passes and anyone spots.
  const easy: Library = {
    ...library,
    shards: library.shards.map((s) =>
      s.floor !== 1
        ? s
        : {
            ...s,
            shards: s.shards.map((x) =>
              x.kind === "cache" ? { ...x, floor: 1, chance: 1, hidden: -100 } : x,
            ),
          },
    ),
  };
  const eix = indexLibrary(easy);

  it("are spotted by a scout and carried home", () => {
    const r = runExpedition(eix, party(1, 3), DEFAULT_ORDERS, 3, thinned(28), {
      shards: ["diggings-cache"],
    });
    expect(r.shards).toEqual(["diggings-cache"]);
    expect(shardLog(r.log).join(" ")).toMatch(/notices warm air/);
    // Found once: the next room doesn't find it again.
    expect(r.haul.filter((h) => h.item === "shard-diggings").length).toBeLessThanOrEqual(1);
  });

  it("can't be found where they aren't, and play no part in a trip with none left", () => {
    const a = runExpedition(ix, party(1, 4), DEFAULT_ORDERS, 4, thinned(28), {
      shards: ["diggings-cache"],
    });
    const b = runExpedition(ix, party(1, 4), DEFAULT_ORDERS, 4, thinned(28), {});
    // The floor-1 shard's cache lies on floor 2.
    expect(a.shards).toBeUndefined();
    // Shards roll on their own stream: the trip is the same either way.
    expect(a.log.map((e) => e.text)).toEqual(b.log.map((e) => e.text));
  });

  it("are never left behind when the packs are full", () => {
    let seen = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = runExpedition(eix, party(1, seed), DEFAULT_ORDERS, seed, thinned(28), {
        shards: ["diggings-cache"],
      });
      if (!r.shards) continue;
      seen++;
      expect(r.log.some((e) => e.kind === "drop" && /shard/i.test(e.text))).toBe(false);
    }
    expect(seen).toBeGreaterThan(10);
  });
});

describe("shards in town", () => {
  /** A town whose Library can look for floor 1's shard: built, staffed, and the matriarch Studied. */
  function studying(): TownState {
    const t = fresh(2);
    const id = t.roster[0]!.id;
    const s: TownState = {
      ...t,
      buildings: { ...t.buildings, library: 1 },
      records: { ...t.records, [id]: { ...t.records[id]!, seen: ["spider-matriarch"] } },
      research: { ...t.research, monsters: { "spider-matriarch": 1000 } },
    };
    return assignDesk(ix, s, t.roster[1]!.id);
  }

  it("the Library works out where one lies once its monsters are Studied", () => {
    const t = fresh(2);
    expect(researchTopics(ix, t).some((x) => x.kind === "shard")).toBe(false);
    let s = studying();
    const topic = researchTopics(ix, s).find((x) => x.id === "shard:diggings-library");
    expect(topic).toBeTruthy();
    // Not before then: a trip couldn't dig it out.
    expect(openShards(ix, s)).not.toContain("diggings-library");
    for (let d = 0; d < 30 && s.shards["diggings-library"]?.lead === undefined; d++)
      s = rest(ix, s, heroNames);
    expect(s.shards["diggings-library"]?.lead).toBeDefined();
    expect(s.news.some((n) => /The Library has it/.test(n.text))).toBe(true);
    expect(openShards(ix, s)).toContain("diggings-library");
    expect(researchTopics(ix, s).some((x) => x.id === "shard:diggings-library")).toBe(false);
    const status = shardProgress(ix, s)[0]!.shards.find((x) => x.id === "diggings-library")!;
    expect(status.state).toBe("lead");
  });

  it("the next party on its floor digs it out, and it goes in the store room", () => {
    let s = studying();
    while (s.shards["diggings-library"]?.lead === undefined) s = rest(ix, s, heroNames);
    s = setOrders(ix, { ...s, research: { ...s.research, desks: [] } }, DEFAULT_ORDERS);
    const out = launch(ix, s, heroNames);
    // Found below: no other party could find it now, though the town doesn't know yet.
    expect(out.outings[0]!.result.shards).toEqual(["diggings-library"]);
    expect(openShards(ix, out)).not.toContain("diggings-library");
    let home = out;
    while (home.outings.length) home = rest(ix, home, heroNames);
    expect(home.lastTrip?.result.outcome).not.toBe("wiped");
    expect(home.materials["shard-diggings"]).toBe(1);
    expect(home.stash).not.toContain("shard-diggings");
    expect(home.shards["diggings-library"]?.found).toBeDefined();
    expect(home.news.some((n) => /1 of the 3 that would seal floor 1/.test(n.text))).toBe(true);
    const floor1 = shardProgress(ix, home)[0]!;
    expect(floor1.held).toBe(1);
    expect(floor1.need).toBe(3);
  });

  it("a lost party's shard lies at its site, kept, for the monsters to carry off", () => {
    // Floor 3 with no retreat: some parties find the floor-1 shard's cache on
    // the way down, then fall.
    let found = 0;
    for (let seed = 0; seed < 300 && !found; seed++) {
      const t = setOrders(ix, fresh(seed), {
        ...DEFAULT_ORDERS,
        targetFloor: 3,
        retreat: { kind: "never" },
      });
      const lent = { ...t, outings: [] };
      const o = launch(ix, lent, heroNames).outings[0]!;
      if (o.result.outcome !== "wiped" || !o.result.shards?.length) continue;
      const kept = o.result.leftBehind.filter((h) => ix.item(h.item).tags.includes("shard"));
      const ran = o.result.porterHaul.filter((h) => ix.item(h.item).tags.includes("shard"));
      expect(kept.length + ran.length).toBe(o.result.shards.length);
      for (const k of kept) expect(k.keep).toBe(true);
      found++;
    }
    expect(found).toBe(1);
  });

  it("start empty, and launchAndWait plays on", () => {
    const t = fresh(1);
    expect(t.shards).toEqual({});
    expect(openShards(ix, t).sort()).toEqual(
      library.shards
        // Act Two's sets (M8.37) wait until there are stairs below their floor.
        .filter((s) => s.floor < t.dungeon.floors.length)
        .flatMap((s) => s.shards)
        .filter((x) => x.kind !== "library")
        .map((x) => x.id)
        .sort(),
    );
    const after = launchAndWait(ix, t, heroNames);
    expect(after.day).toBeGreaterThan(t.day);
  });
});
