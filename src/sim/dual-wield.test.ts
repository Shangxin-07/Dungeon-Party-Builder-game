import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { knownAbilityIds } from "./abilities";
import { runCombat } from "./combat";
import { cantOffhand, createHero, heroSheet, offhandWeapon, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { autoStart, equip, newTown, TownError, type TownState } from "./town";

const ix = indexLibrary(library);

const hero = (classId: string): Hero => {
  const h = createHero(ix, { id: `h-${classId}`, name: "Test", classId }, createRng(1));
  h.classes = { [classId]: 1 };
  return h;
};

/** A town whose first hero is a scout, with spare daggers, a bow and a shield in the store room. */
function scoutTown(): { t: TownState; id: string } {
  const t = autoStart(ix, newTown(ix, heroNames, 1));
  const h = t.roster[0]!;
  h.classId = "scout";
  h.classes = { scout: 1 };
  h.equipment = { weapon: "dagger" };
  t.stash.push("dagger", "short-bow", "wooden-shield", "sword");
  return { t, id: h.id };
}

describe("dual-wielding daggers (M9.04)", () => {
  it("scouts and assassins can carry a dagger in the off hand; fighters can't", () => {
    const s = hero("scout");
    s.equipment = { weapon: "dagger" };
    expect(cantOffhand(ix, s, "dagger")).toBeUndefined();
    expect(cantOffhand(ix, hero("assassin"), "dagger")).toBeUndefined();
    expect(cantOffhand(ix, hero("fighter"), "dagger")).toMatch(/can't fight with/);
    expect(cantOffhand(ix, hero("scout"), "sword")).toMatch(/can't fight with/);
    // Shields and other offhands go there as always.
    expect(cantOffhand(ix, hero("fighter"), "wooden-shield")).toBeUndefined();
  });

  it("only works beside a melee weapon, and the off blade adds no bonuses or moves", () => {
    const s = hero("scout");
    s.equipment = { weapon: "dagger", offhand: "dagger" };
    expect(offhandWeapon(ix, s)).toMatchObject({ item: { id: "dagger" }, damagePercent: -40 });
    const one = hero("scout");
    one.equipment = { weapon: "dagger" };
    expect(heroSheet(ix, s).derived).toEqual(heroSheet(ix, one).derived);
    expect(knownAbilityIds(ix, s)).toEqual(knownAbilityIds(ix, one));
    s.equipment = { weapon: "short-bow", offhand: "dagger" };
    expect(offhandWeapon(ix, s)).toBeUndefined();
    expect(cantOffhand(ix, s, "dagger")).toMatch(/both hands/);
  });

  it("the gear panel puts a second dagger in the off hand, and a bow sends it back", () => {
    const { t, id } = scoutTown();
    const a = equip(ix, t, id, "dagger", "offhand");
    expect(a.roster[0]!.equipment).toMatchObject({ weapon: "dagger", offhand: "dagger" });
    expect(a.stash.filter((x) => x === "dagger")).toHaveLength(0);
    // A shield swaps the blade back to the store room.
    const b = equip(ix, a, id, "wooden-shield");
    expect(b.roster[0]!.equipment.offhand).toBe("wooden-shield");
    expect(b.stash).toContain("dagger");
    // A bow takes both hands: both daggers go back.
    const c = equip(ix, a, id, "short-bow");
    expect(c.roster[0]!.equipment).toEqual({ weapon: "short-bow" });
    expect(c.stash.filter((x) => x === "dagger")).toHaveLength(2);
    expect(() => equip(ix, a, id, "sword", "offhand")).toThrow(TownError);
    expect(() => equip(ix, c, id, "dagger", "offhand")).toThrow(/both hands/);
  });

  it("daggers hit from DEX or STR, whichever is higher (finesse)", () => {
    const s = hero("scout");
    s.equipment = { weapon: "dagger" };
    const atk = (STR: number, DEX: number) => {
      s.stats = { ...s.stats, STR, DEX };
      return heroSheet(ix, s).derived.attack;
    };
    expect(atk(9, 15) - atk(9, 10)).toBe(5);
    // Whichever is higher counts, and only that one.
    expect(atk(10, 18) - atk(14, 18)).toBe(0);
    expect(atk(18, 10) - atk(18, 14)).toBe(0);
    expect(atk(20, 10) - atk(10, 10)).toBe(10);
    // A sword still hits from STR alone.
    s.equipment = { weapon: "sword" };
    expect(atk(9, 15) - atk(9, 10)).toBe(0);
  });

  it("a plain attack is followed by a blow from the other hand", () => {
    const s = hero("scout");
    s.row = "front";
    s.equipment = { weapon: "dagger", offhand: "dagger" };
    let again = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runCombat(ix, [s], ["skeleton", "skeleton"], { seed });
      again += r.log.filter((e) => /in the other hand/.test(e.text)).length;
    }
    expect(again).toBeGreaterThan(0);
    const plain = { ...s, equipment: { weapon: "dagger" } };
    const r = runCombat(ix, [plain], ["giant-rat"], { seed: 1 });
    expect(r.log.some((e) => /other hand/.test(e.text))).toBe(false);
  });
});
