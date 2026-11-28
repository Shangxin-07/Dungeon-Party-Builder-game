import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "../sim/library";
import { autoStart, newTown, type TownState } from "../sim/town";
import { sortRoster } from "./town/rosterSort";

const ix = indexLibrary(library);
const fresh = (): TownState => autoStart(ix, newTown(ix, heroNames, 1));

describe("the roster sort (M9.26)", () => {
  it("sorts by name, and by level highest first", () => {
    const t = fresh();
    const names = sortRoster(ix, t, t.roster, "name")[0]!.heroes.map((h) => h.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const levels = sortRoster(ix, t, t.roster, "level")[0]!.heroes.map((h) => h.level);
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
  });

  it("groups by alignment in the alignments' order", () => {
    const t = fresh();
    const groups = sortRoster(ix, t, t.roster, "alignment");
    const order = [...ix.lib.alignments].sort((a, b) => a.position - b.position).map((a) => a.name);
    const heads = groups.map((g) => g.heading!);
    expect(heads).toEqual(order.filter((n) => heads.includes(n)));
    expect(groups.flatMap((g) => g.heroes)).toHaveLength(t.roster.length);
  });

  it("lists a hero under every party they're in, and the partyless last", () => {
    const t = fresh();
    const [a, b, c] = t.roster;
    const town: TownState = {
      ...t,
      party: [a!.id],
      porters: [],
      parties: [
        { name: "Reds", heroes: [a!.id, b!.id], porters: [], orders: t.orders },
        { name: "Empty", heroes: [], porters: [], orders: t.orders },
      ],
    };
    const groups = sortRoster(ix, town, t.roster, "group");
    expect(groups.map((g) => g.heading)).toEqual(["Next party", "Reds", "In no party"]);
    expect(groups[0]!.heroes.map((h) => h.id)).toEqual([a!.id]);
    expect(groups[1]!.heroes.map((h) => h.id)).toEqual([a!.id, b!.id]);
    expect(groups[2]!.heroes.map((h) => h.id)).toContain(c!.id);
    expect(groups[2]!.heroes.some((h) => h.id === a!.id || h.id === b!.id)).toBe(false);
  });
});
