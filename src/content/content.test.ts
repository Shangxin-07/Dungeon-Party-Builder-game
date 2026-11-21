import { describe, expect, it } from "vitest";
import { validateLibrary } from "../sim/validate";
import { heroNames, library } from "./index";
import type { Library } from "./types";

// Content guard rails (docs/DESIGN.md §12). If you add content and one of
// these fails, the message names the file and the broken field.
describe("content library", () => {
  it("passes every content check", () => {
    expect(validateLibrary(library)).toEqual([]);
  });

  it("has the first-slice classes (then the Cleric) and monsters", () => {
    const base = library.classes.filter((c) => (c.kind ?? "base") === "base");
    expect(base.map((c) => c.id)).toEqual(["fighter", "scout", "mage", "cleric"]);
    for (const id of ["slime", "giant-rat", "goblin", "cave-spider", "skeleton"]) {
      expect(library.monsters.map((m) => m.id)).toContain(id);
    }
  });

  it("has enough names for a full roster", () => {
    expect(new Set(heroNames).size).toBeGreaterThanOrEqual(8);
  });
});

describe("validateLibrary", () => {
  const broken = (patch: Partial<Library>) => validateLibrary({ ...library, ...patch });

  it("catches references to ids that don't exist", () => {
    const [fighter] = library.classes;
    const errors = broken({
      classes: [{ ...fighter!, startingKit: ["laser-sword"], abilities: { fly: 1 }, ai: "genius" }],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown starting item "laser-sword"'),
        expect.stringContaining('unknown ability "fly"'),
        expect.stringContaining('unknown AI "genius"'),
      ]),
    );
  });

  it("catches duplicate and badly formed ids", () => {
    const rat = library.monsters.find((m) => m.id === "giant-rat")!;
    const errors = broken({ monsters: [...library.monsters, rat, { ...rat, id: "Big Rat" }] });
    expect(errors).toContain('monster "giant-rat": duplicate id');
    expect(errors).toContain('monster "Big Rat": id must be kebab-case');
  });

  it("catches out-of-range stats and the reserved attack id", () => {
    const [fighter] = library.classes;
    const errors = broken({
      classes: [{ ...fighter!, baseStats: { ...fighter!.baseStats!, STR: 25 } }],
      abilities: [
        ...library.abilities,
        { id: "attack", name: "X", target: "enemy", tags: [], effects: [{ type: "weaponAttack" }] },
      ],
    });
    expect(errors.some((e) => e.includes("STR must be a whole number 1-20"))).toBe(true);
    expect(errors.some((e) => e.includes("reserved"))).toBe(true);
  });

  it("won't let summon-only monsters appear in encounters", () => {
    const errors = broken({
      encounters: [
        {
          id: "x",
          floors: [1, 1],
          weight: 1,
          groups: [{ monster: "little-slime", count: [1, 1] }],
        },
      ],
    });
    expect(errors).toContain('encounter "x": "little-slime" is summon-only');
  });

  it("checks rooms, loot tables and floors", () => {
    const odd = { name: "Odd", floors: [1, 1] as const, weight: 1, descriptions: ["x"] };
    const errors = broken({
      rooms: [
        ...library.rooms,
        { ...odd, id: "odd-room", behaviour: "teleport", descriptions: [] },
        { ...odd, id: "bad-chest", behaviour: "treasure", loot: "nope" },
      ],
      lootTables: [
        ...library.lootTables,
        { id: "bad-loot", rolls: [1, 1], entries: [{ item: "laser-sword", weight: 1 }] },
      ],
      floors: [
        ...library.floors,
        {
          id: "deep",
          depth: 9,
          name: "Deep",
          rooms: [3, 3],
          fixedRooms: ["nowhere"],
          capacity: 10,
          startPopulation: 20,
        },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'room "odd-room": unknown behaviour "teleport"',
        'room "odd-room": needs at least one description',
        'room "bad-chest": unknown loot table "nope"',
        'loot table "bad-loot": unknown item "laser-sword"',
        'floor "deep": unknown room "nowhere"',
        'floor "deep": no rooms can appear at depth 9',
        'floor "deep": startPopulation must be between 0 and capacity',
        "floors: depth 6 is missing",
      ]),
    );
  });
});
