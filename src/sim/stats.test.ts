import { describe, expect, it } from "vitest";
import { library } from "../content";
import type { StatBlock } from "../content/types";
import { createHero, heroSheet } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { baseDerived, computeDerived, effectiveStats, skillValue } from "./stats";

const ix = indexLibrary(library);
const avg: StatBlock = { STR: 10, DEX: 10, END: 10, PER: 10, INT: 10, WIL: 10, CHA: 10 };

describe("derived stats (DESIGN.md §5)", () => {
  it("follow the design formulas", () => {
    const s: StatBlock = { STR: 14, DEX: 12, END: 13, PER: 9, INT: 7, WIL: 11, CHA: 8 };
    expect(baseDerived(s, false)).toEqual({
      maxHp: 10 + 13 * 3 + 14,
      mana: 7 * 2 + 11,
      attack: 14,
      accuracy: 12 + 4,
      evasion: 12 + 4,
      initiative: 12 + 9,
      spellPower: 7,
      resist: 11,
      armor: 0,
      carrySlots: 4 + 5,
    });
    // Ranged weapons use DEX and PER instead of STR.
    expect(baseDerived(s, true).attack).toBe(Math.round((12 + 9) / 2));
  });

  it("apply modifyStat to primary and secondary stats", () => {
    const passives = [
      { type: "modifyStat", stat: "END", amount: 2 },
      { type: "modifyStat", stat: "armor", amount: 4 },
    ] as const;
    const stats = effectiveStats(avg, passives);
    expect(stats.END).toBe(12);
    const d = computeDerived(stats, passives);
    expect(d.maxHp).toBe(10 + 36 + 10);
    expect(d.armor).toBe(4);
  });

  it("let monster overrides replace a formula", () => {
    expect(computeDerived(avg, [], { overrides: { maxHp: 8 } }).maxHp).toBe(8);
  });

  it("work out skills from two stats plus perks, capped at 100", () => {
    const scouting = ix.skill("scouting");
    expect(skillValue(scouting, avg, [])).toBe(50);
    expect(
      skillValue(scouting, avg, [{ type: "modifySkill", skill: "scouting", amount: 15 }]),
    ).toBe(65);
    expect(
      skillValue(scouting, { ...avg, PER: 20, DEX: 20 }, [
        { type: "modifySkill", skill: "scouting", amount: 15 },
      ]),
    ).toBe(100);
  });
});

describe("heroes", () => {
  it("start with their class kit equipped and full HP", () => {
    const bram = createHero(ix, { id: "h1", name: "Bram", classId: "fighter" }, createRng(1));
    expect(bram.equipment).toEqual({
      weapon: "sword",
      armor: "chainmail",
      offhand: "wooden-shield",
    });
    expect(bram.pack).toEqual(["healing-potion"]);
    const sheet = heroSheet(ix, bram);
    expect(bram.hp).toBe(sheet.derived.maxHp);
    expect(sheet.derived.armor).toBe(5);
  });

  it("roll stats close to the class baseline", () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) {
      const h = createHero(ix, { id: "h", name: "X", classId: "scout" }, rng);
      for (const [k, v] of Object.entries(h.stats)) {
        expect(Math.abs(v - ix.cls("scout").baseStats[k as keyof StatBlock])).toBeLessThanOrEqual(
          2,
        );
      }
    }
  });

  it("get perk bonuses on their sheet", () => {
    const wren = createHero(ix, { id: "h2", name: "Wren", classId: "scout" }, createRng(2));
    const before = heroSheet(ix, wren).skills.scouting!;
    const after = heroSheet(ix, { ...wren, perks: ["keen-eye"] }).skills.scouting!;
    expect(after - before).toBe(Math.min(15, 100 - before));
  });
});
