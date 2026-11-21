import { describe, expect, it } from "vitest";
import { library } from "../content";
import { floorPower, rollEncounter } from "./encounter";
import { indexLibrary } from "./library";
import { createRng } from "./rng";

const ix = indexLibrary(library);

describe("encounters", () => {
  it("scale power ×1.3 per floor (DESIGN.md §3)", () => {
    expect([1, 2, 3, 4, 5, 10].map(floorPower)).toEqual([10, 13, 17, 22, 29, 106]);
  });

  it("only use monsters allowed on the floor, close to the target power", () => {
    const rng = createRng(11);
    for (const floor of [1, 2, 3]) {
      const allowed = new Set(
        library.encounters
          .filter((e) => floor >= e.floors[0] && floor <= e.floors[1])
          .flatMap((e) => e.groups.map((g) => g.monster)),
      );
      for (let i = 0; i < 100; i++) {
        const monsters = rollEncounter(ix, floor, rng);
        expect(monsters.length).toBeGreaterThan(0);
        expect(monsters.length).toBeLessThanOrEqual(8);
        // A variant (a Spider Matriarch) stands in for its base monster and is
        // meant to push the fight a little over the usual power.
        const base = monsters.map((m) => ix.monster(m).variant?.of ?? m);
        for (const m of base) expect(allowed).toContain(m);
        const power = base.reduce((s, m) => s + ix.monster(m).power, 0);
        expect(power).toBeLessThanOrEqual(Math.ceil(floorPower(floor) * 1.25));
      }
    }
  });

  it("puts the front row first", () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) {
      const rows = rollEncounter(ix, 2, rng).map((m) => ix.monster(m).row);
      expect(rows.join(",")).toMatch(/^(front,?)*(back,?)*$/);
    }
  });
});
