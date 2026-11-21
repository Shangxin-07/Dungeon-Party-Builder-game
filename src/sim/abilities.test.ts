import { describe, expect, it } from "vitest";
import { library } from "../content";
import { defineMonster, definePerk, type Library } from "../content/types";
import { abilitiesAtLevel, knownAbilities, knownAbilityIds, upcomingAbilities } from "./abilities";
import { registerAi } from "./ai";
import { runCombat } from "./combat";
import { rollEncounter } from "./encounter";
import { createHero, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const hero = (classId: string, level = 1): Hero => {
  const h = createHero(ix, { id: `h-${classId}`, name: "Test", classId }, createRng(1));
  h.level = level;
  h.classes = { [classId]: level };
  return h;
};

describe("which abilities a hero knows", () => {
  it("comes from the class list by level, and from the gear in hand", () => {
    const f = hero("fighter");
    f.equipment = { weapon: "sword", offhand: "wooden-shield" };
    expect(knownAbilityIds(ix, f)).toEqual(["power-strike", "disarm", "shield-bash"]);
    expect(upcomingAbilities(ix, f).map((u) => [u.ability.id, u.level])).toEqual([
      ["second-wind", 4],
      ["whirlwind", 7],
    ]);

    f.level = 4;
    f.classes = { fighter: 4 };
    f.equipment = { weapon: "war-axe" };
    const known = knownAbilities(ix, f);
    expect(known.map((k) => k.ability.id)).toEqual(["power-strike", "second-wind", "cleave"]);
    expect(known.find((k) => k.ability.id === "cleave")).toMatchObject({
      source: "gear",
      from: "War Axe",
    });
  });

  it("lists what's learned at each level", () => {
    expect(abilitiesAtLevel(ix, "mage", 4).map((a) => a.id)).toEqual(["frost-lance"]);
    expect(abilitiesAtLevel(ix, "mage", 2)).toEqual([]);
  });

  it("anyone holding the weapon gets its ability, and duplicates count once", () => {
    const c = hero("cleric");
    c.equipment = { weapon: "axe", offhand: "iron-shield" };
    expect(knownAbilityIds(ix, c)).toEqual(["prayer", "smite", "cleave", "shield-bash"]);
  });

  it("perks can teach abilities", () => {
    const lib: Library = {
      ...library,
      perks: [
        ...library.perks,
        definePerk({
          id: "test-brawler",
          name: "Brawler",
          description: "Learns Shield Bash.",
          classes: [],
          passives: [],
          abilities: ["shield-bash"],
        }),
      ],
    };
    expect(validateLibrary(lib)).toEqual([]);
    const lix = indexLibrary(lib);
    const s = createHero(lix, { id: "s", name: "S", classId: "scout" }, createRng(1));
    s.perks = ["test-brawler"];
    expect(knownAbilities(lix, s).at(-1)).toMatchObject({ source: "perk", from: "Brawler" });
  });
});

describe("abilities in a fight", () => {
  // A big punching bag that never hits back, so fights run long.
  registerAi("test-wait", () => ({ kind: "wait" }));
  const lib: Library = {
    ...library,
    monsters: [
      ...library.monsters,
      defineMonster({
        id: "test-bag",
        name: "Bag",
        power: 1,
        stats: { STR: 1, DEX: 1, END: 10, PER: 1, INT: 1, WIL: 1, CHA: 1 },
        overrides: { maxHp: 9999, evasion: -50 },
        weapon: { name: "nothing", damageType: "crushing", attack: 0 },
        row: "front",
        tags: [],
        ai: "test-wait",
      }),
      defineMonster({
        id: "test-back-bag",
        name: "Back Bag",
        power: 1,
        stats: { STR: 1, DEX: 1, END: 10, PER: 1, INT: 1, WIL: 1, CHA: 1 },
        overrides: { maxHp: 9999, evasion: -50 },
        weapon: { name: "nothing", damageType: "crushing", attack: 0 },
        row: "back",
        tags: [],
        ai: "test-wait",
      }),
    ],
  };
  const lix = indexLibrary(lib);

  it("waits out a cooldown between uses", () => {
    const f = createHero(lix, { id: "f", name: "Bram", classId: "fighter" }, createRng(1));
    f.equipment = { weapon: "sword" };
    const r = runCombat(lix, [f], ["test-bag"], { seed: 1, maxRounds: 12 });
    const rounds = r.log.filter((e) => e.text.includes("Power Strike")).map((e) => e.round);
    expect(rounds.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < rounds.length; i++)
      expect(rounds[i]! - rounds[i - 1]!).toBeGreaterThanOrEqual(3);
  });

  it("uses a once-a-fight ability only once", () => {
    const f = createHero(lix, { id: "f", name: "Bram", classId: "fighter" }, createRng(1));
    f.level = 4;
    f.classes = { fighter: 4 };
    f.hp = 5; // badly hurt from the start
    f.pack = [];
    const r = runCombat(lix, [f], ["test-bag"], { seed: 1, maxRounds: 8 });
    expect(r.log.filter((e) => e.text.includes("Second Wind"))).toHaveLength(1);
  });

  it("a melee Cleave hits the front row only", () => {
    const f = createHero(lix, { id: "f", name: "Bram", classId: "fighter" }, createRng(1));
    f.equipment = { weapon: "axe" };
    const r = runCombat(lix, [f], ["test-bag", "test-bag", "test-back-bag"], {
      seed: 2,
      maxRounds: 3,
    });
    const cleave = r.log.findIndex((e) => e.text.includes("Cleave"));
    expect(cleave).toBeGreaterThanOrEqual(0);
    const next = r.log
      .slice(cleave + 1)
      .findIndex((e) => e.kind === "action" || e.kind === "round");
    const hits = r.log.slice(cleave + 1, cleave + 1 + next).filter((e) => e.kind === "damage");
    const hitUids = new Set(hits.map((e) => e.target));
    const backUid = r.fighters.find((x) => x.monsterId === "test-back-bag")!.uid;
    expect(hitUids.has(backUid)).toBe(false);
  });
});

describe("ability validation", () => {
  it("catches bad cooldowns, unknown gear abilities and abilities on armour", () => {
    const [firebolt] = library.abilities;
    const chain = library.items.find((i) => i.id === "chainmail")!;
    const errors = validateLibrary({
      ...library,
      abilities: [...library.abilities.slice(1), { ...firebolt!, cooldown: 0 }],
      items: [
        ...library.items.filter((i) => i.id !== "chainmail"),
        { ...chain, abilities: ["cleave", "fly"] },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("cooldown must be a whole number"),
        expect.stringContaining("only weapons and offhands"),
        expect.stringContaining('unknown ability "fly"'),
      ]),
    );
  });
});

describe("monster moves", () => {
  it("unlock with the floor's monster level", () => {
    const run = (level: number) =>
      runCombat(ix, [], ["giant-rat"], { seed: 1, level }).fighters[0]!.abilities;
    expect(run(1)).toEqual([]);
    expect(run(2)).toEqual(["gnaw"]);
  });

  it("variants stand in for their base monster, at most one per fight", () => {
    let seen = 0;
    const rng = createRng(5);
    for (let i = 0; i < 300; i++) {
      const m = rollEncounter(ix, 2, rng);
      const variants = m.filter((id) => ix.monster(id).variant);
      expect(variants.length).toBeLessThanOrEqual(1);
      seen += variants.length;
    }
    expect(seen).toBeGreaterThan(0);
    // Never on a floor-1 fight at its usual level.
    for (let i = 0; i < 300; i++)
      expect(rollEncounter(ix, 1, rng).some((id) => ix.monster(id).variant)).toBe(false);
  });
});
