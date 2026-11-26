import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { defineClass, defineItem, defineMonster, type Library } from "../content/types";
import { registerAi } from "./ai";
import { runCombat, type CombatEvent } from "./combat";
import { createHero, createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const party = (seed = 1) => createStarterParty(ix, heroNames, createRng(seed));
const texts = (log: CombatEvent[]) => log.map((e) => e.text);

describe("combat", () => {
  it("is deterministic: same seed, same fight", () => {
    const a = runCombat(ix, party(), ["goblin", "goblin", "goblin-archer"], { seed: 9 });
    const b = runCombat(ix, party(), ["goblin", "goblin", "goblin-archer"], { seed: 9 });
    expect(a.log).toEqual(b.log);
    expect(a.party).toEqual(b.party);
  });

  it("marks lines as good or bad news for the party", () => {
    const r = runCombat(ix, party(), ["goblin", "goblin", "goblin-archer"], { seed: 9 });
    const heroIds = new Set(r.party.map((h) => h.id));
    for (const e of r.log) {
      if (e.kind === "killed") expect(e.tone).toBe("good");
      if (e.kind === "downed" || e.kind === "died") expect(e.tone).toBe("bad");
      if (e.kind === "hit") expect(e.tone).toBe(heroIds.has(e.actor!) ? "good" : "bad");
      if (e.kind === "damage" && e.amount)
        expect(e.tone).toBe(heroIds.has(e.target!) ? "bad" : "good");
      if (e.kind === "round" || e.kind === "miss") expect(e.tone).toBeUndefined();
    }
    expect(r.log.at(-1)!.tone).toBe(r.winner === "party" ? "good" : "bad");
    expect(r.log.some((e) => e.tone === "good")).toBe(true);
    expect(r.log.some((e) => e.tone === "bad")).toBe(true);
  });

  it("plays out differently with a different seed", () => {
    const logs = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        JSON.stringify(runCombat(ix, party(), ["goblin", "goblin"], { seed }).log),
      ),
    );
    expect(logs.size).toBeGreaterThan(1);
  });

  it("lets a fresh party beat a lone rat and records the kill", () => {
    const r = runCombat(ix, party(), ["giant-rat"], { seed: 1 });
    expect(r.winner).toBe("party");
    expect(r.kills).toEqual(["giant-rat"]);
    expect(r.log.at(-1)?.kind).toBe("end");
  });

  it("doesn't change the heroes passed in", () => {
    const heroes = party();
    const copy = structuredClone(heroes);
    runCombat(ix, heroes, ["goblin", "goblin", "goblin", "goblin-archer"], { seed: 3 });
    expect(heroes).toEqual(copy);
  });

  it("splits slimes that are hit hard (trigger + summon effects)", () => {
    const fights = Array.from({ length: 20 }, (_, i) =>
      runCombat(ix, party(), ["slime"], { seed: i }),
    );
    const split = fights.find((r) => texts(r.log).includes("Slime splits in two!"));
    expect(split).toBeDefined();
    expect(split!.fighters.some((f) => f.monsterId === "little-slime")).toBe(true);
  });

  it("lets skeletons resist arrows", () => {
    const r = runCombat(ix, party(), ["skeleton", "skeleton"], { seed: 2 });
    const arrowHits = r.log.filter((e) => e.kind === "damage" && e.text.includes("piercing"));
    expect(arrowHits.length).toBeGreaterThan(0);
    for (const e of arrowHits) expect(e.text).toContain("(resisted)");
  });

  it("only lets melee reach the back row once the front row is down", () => {
    const r = runCombat(ix, party(), ["goblin", "goblin-archer"], { seed: 4 });
    const fighter = r.fighters.find((f) => f.side === "party" && f.ai === "fighter")!;
    const goblin = r.fighters.find((f) => f.monsterId === "goblin")!;
    const archer = r.fighters.find((f) => f.monsterId === "goblin-archer")!;
    const goblinDown = r.log.findIndex((e) => e.kind === "killed" && e.target === goblin.uid);
    r.log.forEach((e, i) => {
      if (e.kind === "hit" && e.actor === fighter.uid && e.target === archer.uid) {
        expect(goblinDown).toBeGreaterThanOrEqual(0);
        expect(i).toBeGreaterThan(goblinDown);
      }
    });
  });

  it("drinks potions when hurt and uses them up", () => {
    const [bram, ...rest] = party();
    const hurt: Hero = { ...bram!, hp: 5 };
    const r = runCombat(ix, [hurt, ...rest], ["giant-rat", "giant-rat"], { seed: 1 });
    expect(texts(r.log)).toContain(`${bram!.name} uses a Healing Potion.`);
    expect(r.party[0]!.pack).not.toContain("healing-potion");
  });

  it("springs ambushes unless someone spots them", () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const r = runCombat(ix, party(seed), ["cave-spider"], { seed });
      const ambush = r.log.find((e) => e.kind === "ambush")!;
      outcomes.add(ambush.text.startsWith("Ambush!") ? "sprung" : "spotted");
      if (ambush.text.startsWith("Ambush!")) {
        // The spider acts before round 1.
        expect(r.log.some((e) => e.round === 0 && (e.kind === "damage" || e.kind === "miss"))).toBe(
          true,
        );
      }
    }
    expect(outcomes).toEqual(new Set(["sprung", "spotted"]));
  });
});

// A made-up library proves new content needs no engine changes: a new class,
// a new monster and a new AI, all defined here as data plus one registered hook.
describe("downed heroes (custom content)", () => {
  registerAi("test-idle", () => ({ kind: "wait" }));

  const wall = { STR: 1, DEX: 1, END: 20, PER: 1, INT: 1, WIL: 1, CHA: 1 };
  const testLib: Library = {
    ...library,
    items: [
      ...library.items,
      defineItem({
        id: "test-plate",
        name: "Test Plate",
        slot: "armor",
        value: 0,
        tags: [],
        passives: [{ type: "modifyStat", stat: "armor", amount: 100 }],
      }),
    ],
    classes: [
      ...library.classes,
      defineClass({
        id: "wall",
        name: "Wall",
        blurb: "Does nothing. Never falls.",
        mainStats: ["END"],
        baseStats: wall,
        likes: [],
        row: "front",
        ai: "test-idle",
        abilities: {},
        startingKit: ["test-plate"],
        growth: {},
      }),
      defineClass({
        id: "nurse",
        name: "Nurse",
        blurb: "Heals.",
        mainStats: ["INT"],
        baseStats: { ...wall, INT: 20, WIL: 20 },
        likes: [],
        row: "back",
        ai: "caster",
        abilities: { mend: 1 },
        startingKit: [],
        growth: {},
      }),
    ],
    monsters: [
      ...library.monsters,
      defineMonster({
        id: "sniper",
        name: "Sniper",
        power: 1,
        stats: { ...wall, DEX: 20, PER: 20 },
        overrides: { maxHp: 999, evasion: 99 },
        weapon: { name: "longbow", damageType: "piercing", attack: 0, ranged: true },
        row: "back",
        tags: [],
        ai: "archer",
      }),
    ],
  };
  const tix = indexLibrary(testLib);
  const make = (id: string, classId: string, extra: Partial<Hero> = {}): Hero => ({
    ...createHero(tix, { id, name: id, classId }, createRng(1)),
    stats: classId === "nurse" ? { ...wall, INT: 20, WIL: 20 } : wall,
    ...extra,
  });

  it("is valid content", () => {
    expect(validateLibrary(testLib)).toEqual([]);
  });

  it("bleeds out after two rounds if nobody helps", () => {
    const tank = make("Tank", "wall", { hp: 10_000, mana: 0 });
    const victim = make("Victim", "wall", { hp: 1, mana: 0 });
    // The sniper shoots the weakest standing hero: the victim first.
    const r = runCombat(tix, [tank, victim], ["sniper"], { seed: 1, maxRounds: 8 });
    const lines = texts(r.log);
    expect(lines).toContain("Victim goes down!");
    expect(lines).toContain("Victim is bleeding out (1 round left).");
    expect(lines).toContain("Victim has bled out.");
    expect(r.party[1]!.condition).toBe("dead");
    expect(r.winner).toBe("none");
  });

  it("can be healed back up before bleeding out", () => {
    const tank = make("Tank", "wall", { hp: 10_000, mana: 0 });
    const victim = make("Victim", "wall", { hp: 1, mana: 0 });
    const nurse = make("Nurse", "nurse", { hp: 10_000, mana: 500, row: "back" });
    const r = runCombat(tix, [tank, victim, nurse], ["sniper"], { seed: 1, maxRounds: 6 });
    expect(r.log.some((e) => e.kind === "revived" && e.target === "Victim")).toBe(true);
    expect(texts(r.log)).not.toContain("Victim has bled out.");
  });
});

describe("the back row", () => {
  it("gets a loud warning once the front row has all fallen", () => {
    let warned = 0;
    for (let seed = 0; seed < 200; seed++) {
      const heroes = party(seed);
      const r = runCombat(ix, heroes, ["skeleton", "skeleton", "skeleton", "skeleton"], {
        seed,
        level: 3,
      });
      const i = r.log.findIndex((e) => e.kind === "exposed");
      if (i < 0) continue;
      warned++;
      // Every front-row hero is down by then.
      const fronts = heroes.filter((h) => h.row === "front").map((h) => h.id);
      for (const id of fronts)
        expect(r.log.slice(0, i).some((e) => e.kind === "downed" && e.target === id)).toBe(true);
    }
    expect(warned).toBeGreaterThan(0);
  });

  it("warns at the start if nobody is in the front row", () => {
    const heroes = party().map((h) => ({ ...h, row: "back" as const }));
    const r = runCombat(ix, heroes, ["goblin"], { seed: 1 });
    expect(r.log[1]?.kind).toBe("exposed");
  });
});

describe("a floor's fighting ground (§21)", () => {
  it("is told at the start, and its passives count for that side all fight", () => {
    const ground = ix.floor(2).ground!;
    expect(ground).toBeDefined();
    const plain = runCombat(ix, party(), ["giant-rat"], { seed: 3 });
    const tight = runCombat(ix, party(), ["giant-rat"], { seed: 3, ground });
    expect(plain.log.some((e) => e.kind === "ground")).toBe(false);
    expect(tight.log.find((e) => e.kind === "ground")?.text).toBe(ground.text);
    // A hero with no room to dodge gets hit more often over many fights.
    const hits = (g?: typeof ground) => {
      let n = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const opts = { seed, ...(g ? { ground: g } : {}) };
        const r = runCombat(ix, party(), ["giant-rat", "giant-rat"], opts);
        const rats = r.fighters.filter((f) => f.side === "monsters").map((f) => f.name);
        n += r.log.filter((e) => e.kind === "hit" && rats.some((x) => e.text.startsWith(x))).length;
      }
      return n;
    };
    expect(hits(ground)).toBeGreaterThan(hits());
  });
});

describe("the restless dead (§21)", () => {
  it("get back up once, unless the killing blow breaks, burns or blesses them", () => {
    let rose = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = runCombat(ix, party(seed), ["restless-bones"], { seed });
      const ups = r.log.filter((e) => /drag themselves back together/.test(e.text));
      expect(ups.length).toBeLessThanOrEqual(1);
      rose += ups.length;
      // Getting up isn't a kill: one set of bones, at most one kill.
      expect(r.kills.length).toBeLessThanOrEqual(1);
    }
    expect(rose).toBeGreaterThan(0);
  });

  it("never get up from a crushing, fire or holy killing blow", () => {
    const lastHit = (log: CombatEvent[], before: number) =>
      log
        .slice(0, before)
        .reverse()
        .find((x) => x.kind === "damage" && x.text.startsWith("Restless Bones"));
    let checked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      // Half the party swings maces, so some killing blows crush.
      const heroes = party(seed).map((h, i) =>
        i % 2 ? h : { ...h, equipment: { ...h.equipment, weapon: "mace" } },
      );
      const r = runCombat(ix, heroes, ["restless-bones"], { seed });
      r.log.forEach((e, i) => {
        if (!/drag themselves back together/.test(e.text)) return;
        const blow = lastHit(r.log, i);
        expect(blow?.text).not.toMatch(/crushing|fire|holy/);
        checked++;
      });
      const killed = r.log.find((e) => e.kind === "killed");
      if (killed) {
        const blow = lastHit(r.log, r.log.indexOf(killed));
        if (blow && /crushing|fire|holy/.test(blow.text)) checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});
