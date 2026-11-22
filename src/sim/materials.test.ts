/**
 * Materials (DESIGN.md §8): found in the dungeon, carried home, kept in the
 * guild's store, spent on buildings and at the Temple.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library, materials } from "../content";
import type { Library } from "../content/types";
import { indexLibrary } from "./library";
import { rollLootTable } from "./loot";
import { createRng } from "./rng";
import {
  autoStart,
  cantLaunch,
  launchAndWait,
  materialsShort,
  newTown,
  rest,
  upgrade,
  TownError,
} from "./town";
import { validateLibrary } from "./validate";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));

describe("materials", () => {
  it("are items in the material slot, and a new town has none", () => {
    expect(materials.length).toBeGreaterThan(0);
    for (const m of materials) {
      expect(ix.item(m.id).slot).toBe("material");
      expect(m.tags).toContain("material");
    }
    expect(fresh().materials).toEqual({});
  });

  it("each turn up in some loot table (or a workshop), and something needs each one", () => {
    const dropped = new Set([
      ...library.lootTables.flatMap((t) => t.entries.map((e) => e.item)),
      // M7.14: some are only made, like planks at the Sawmill.
      ...library.recipes.map((r) => r.makes),
    ]);
    const wanted = new Set(
      library.buildings.flatMap((b) =>
        b.levels.flatMap((l) => [
          ...Object.keys(l.materials ?? {}),
          ...l.effects.flatMap((e) =>
            e.type === "resurrect" ? Object.keys(e.materials ?? {}) : [],
          ),
        ]),
      ),
    );
    for (const r of library.recipes) for (const m of Object.keys(r.materials)) wanted.add(m);
    // M7.16: stairhead barricades.
    for (const b of library.barricades) for (const m of Object.keys(b.materials)) wanted.add(m);
    for (const m of materials) {
      expect(dropped.has(m.id), m.id).toBe(true);
      expect(wanted.has(m.id), m.id).toBe(true);
    }
  });

  it("are dug out of ore seams", () => {
    const rng = createRng(5);
    const found = Array.from({ length: 50 }, () => rollLootTable(ix, "ore-seam", rng)).flat();
    expect(found.filter((id) => id === "iron-ore").length).toBeGreaterThan(40);
  });

  it("come home from trips into the store, not to the Market", () => {
    let t = fresh(2);
    let got = 0;
    for (let i = 0; i < 12; i++) {
      for (let d = 0; d < 3 || (cantLaunch(ix, t) && d < 30); d++) t = rest(ix, t, heroNames);
      if (cantLaunch(ix, t)) break;
      const before = { ...t.materials };
      t = launchAndWait(ix, t, heroNames);
      const trip = t.lastTrip!.materials ?? {};
      for (const [id, n] of Object.entries(trip)) {
        expect(t.materials[id]).toBe((before[id] ?? 0) + n);
        got += n;
      }
      if (t.lastTrip!.result.outcome === "wiped") break;
    }
    expect(got).toBeGreaterThan(0);
  });

  it("are needed, and used up, by the bigger buildings", () => {
    const t = { ...fresh(), gold: 5000 };
    t.buildings = { ...t.buildings, palisade: 1 };
    expect(materialsShort(ix, t, { "iron-ore": 4 })).toBe("4 iron ore");
    expect(() => upgrade(ix, t, "palisade")).toThrow(TownError);
    expect(() => upgrade(ix, t, "palisade")).toThrow(/short of 3 iron ore/);
    const after = upgrade(ix, { ...t, materials: { "iron-ore": 4 } }, "palisade");
    expect(after.materials).toEqual({ "iron-ore": 1 });
    expect(after.gold).toBe(5000 - 250);
    // Gold alone still builds the first level of most things.
    expect(() => upgrade(ix, t, "gate")).not.toThrow();
  });

  it("must be real materials in whole numbers (content check)", () => {
    const bad: Library = {
      ...library,
      buildings: library.buildings.map((b) =>
        b.id === "gate"
          ? { ...b, levels: [{ ...b.levels[0]!, materials: { gem: 2, "iron-ore": 0.5 } }] }
          : b,
      ),
    };
    const errors = validateLibrary(bad).join("\n");
    expect(errors).toMatch(/"gem" isn't a material/);
    expect(errors).toMatch(/whole number of "iron-ore"/);
  });
});
