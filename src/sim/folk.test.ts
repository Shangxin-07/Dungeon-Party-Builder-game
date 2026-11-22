/**
 * Townsfolk (M7.15, DESIGN.md §18.1b, 2b): arrivals, food, taxes, jobs, raids.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  autoStart,
  benchFolk,
  folkRoom,
  newTown,
  postEffects,
  postFolk,
  queueJob,
  rest,
  setFolkJob,
  whyNoSettlers,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const rules = library.townsfolk;
const base = (): TownState => {
  const t = autoStart(ix, newTown(ix, heroNames, 1));
  return { ...t, posts: {}, raids: [] };
};
const settled = (count: number, food = 10): TownState => {
  const t = base();
  return {
    ...t,
    buildings: { ...t.buildings, cottages: 3, farm: 3, sawmill: 1 },
    folk: { count, food, jobs: {} },
  };
};

describe("townsfolk", () => {
  it("only come with housing, food for one more, and a quiet pit", () => {
    const t = base();
    expect(whyNoSettlers(ix, t)).toMatch(/Cottages/);
    const homes = { ...t, buildings: { ...t.buildings, cottages: 1 } };
    expect(whyNoSettlers(ix, homes)).toMatch(/food/);
    const fed = { ...homes, buildings: { ...homes.buildings, farm: 1 } };
    expect(whyNoSettlers(ix, fed)).toBeUndefined();
    const raided = {
      ...fed,
      raids: [{ ...({} as TownState["raids"][number]), day: fed.day, outcome: "overrun" as const }],
    };
    expect(whyNoSettlers(ix, raided)).toMatch(/raid got through/);
    // Given a few days, someone moves in.
    let x: TownState = fed;
    for (let d = 0; d < 20 && !x.folk?.count; d++) x = rest(ix, x, heroNames);
    expect(x.folk!.count).toBeGreaterThan(0);
    expect(x.news.some((n) => /moved into the Cottages/.test(n.text))).toBe(true);
  });

  it("eat, pay taxes, and leave when there's no food", () => {
    const t = settled(6, 10);
    const after = rest(ix, t, heroNames);
    const tax = after.ledger.find((l) => l.kind === "taxes" && l.day === t.day);
    expect(tax?.amount).toBeGreaterThanOrEqual(6 * rules.tax);
    const hungry = rest(
      ix,
      { ...t, buildings: { ...t.buildings, farm: 0 }, folk: { count: 6, food: 0, jobs: {} } },
      heroNames,
    );
    expect(hungry.folk!.count).toBe(5);
    expect(hungry.news.some((n) => /isn't enough food/.test(n.text))).toBe(true);
  });

  it("work the salvage crew and benches, after the heroes, and never add defence", () => {
    let t = settled(4);
    t = setFolkJob(ix, t, "post:lookout", 1);
    expect(postFolk(ix, t, "lookout")).toBe(1);
    expect(postEffects(ix, t).some((e) => e.type === "defence")).toBe(false);
    expect(postEffects(ix, t).some((e) => e.type === "raidWarning")).toBe(true);
    expect(() => setFolkJob(ix, t, "post:barricade", 1)).toThrow(/can't/);
    // The lookout has one slot; a hero there pushes the settler out.
    const hero = { ...t, posts: { lookout: [t.roster[0]!.id] } };
    expect(postFolk(ix, hero, "lookout")).toBe(0);
    expect(folkRoom(ix, hero, "post:lookout")).toBe(0);
    // A bench.
    t = setFolkJob(ix, { ...t, materials: { timber: 2 } }, "workshop:sawmill", 1);
    expect(benchFolk(ix, t, "sawmill")).toBe(1);
    t = queueJob(ix, t, "sawmill", "planks");
    for (let d = 0; d < 3; d++) t = rest(ix, t, heroNames);
    expect(t.materials.planks).toBe(2);
    expect(() => setFolkJob(ix, t, "post:salvage", 10)).toThrow(/Nobody free/);
  });

  it("are scared off by a raid that gets through", () => {
    const t = settled(8);
    // A crowded floor 1 and nobody fit to fight: the raid gets through.
    const crowded = {
      ...t,
      roster: t.roster.map((h) => ({ ...h, hp: 1 })),
      dungeon: {
        ...t.dungeon,
        floors: t.dungeon.floors.map((f, i) =>
          i ? f : { ...f, population: ix.floor(1).capacity + 20 },
        ),
      },
    } as TownState;
    const after = rest(ix, crowded, heroNames);
    expect(after.raids.at(-1)?.outcome).toBe("unopposed");
    expect(after.folk!.count).toBe(8 - Math.ceil(8 * rules.fleeOnRaid));
  });
});
