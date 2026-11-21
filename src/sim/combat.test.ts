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

  it("bleeds out after three rounds if nobody helps", () => {
    const tank = make("Tank", "wall", { hp: 10_000, mana: 0 });
    const victim = make("Victim", "wall", { hp: 1, mana: 0 });
    // The sniper shoots the weakest standing hero: the victim first.
    const r = runCombat(tix, [tank, victim], ["sniper"], { seed: 1, maxRounds: 8 });
    const lines = texts(r.log);
    expect(lines).toContain("Victim goes down!");
    expect(lines).toContain("Victim is bleeding out (2 rounds left).");
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
