/**
 * Fog over the floors (M7.13, DESIGN.md §18.3): the pit map shows what the
 * town knows, from the Watchtower, a lookout, parties and scouts.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import {
  autoStart,
  floorKnowledge,
  fogBand,
  launchAndWait,
  newTown,
  pitMap,
  watchRange,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fog = library.scouting.fog;
const fresh = (seed = 1): TownState => {
  const t = autoStart(ix, newTown(ix, heroNames, seed));
  return { ...t, posts: {}, buildings: { ...t.buildings, watchtower: 0 } };
};
const tower = (t: TownState, level: number): TownState => ({
  ...t,
  buildings: { ...t.buildings, watchtower: level },
});
const capacity = (depth: number) => ix.floor(depth).capacity;

describe("fog bands", () => {
  it("name how full a floor feels", () => {
    expect(fogBand(ix, 0)).toBe(fog.bands[0]!.name);
    expect(fogBand(ix, 1)).toBe("full");
    expect(fogBand(ix, 50)).toBe(fog.bands.at(-1)!.name);
  });
});

describe("the pit map", () => {
  it("shows nothing below without a watch or word from a party", () => {
    const t = fresh();
    expect(watchRange(ix, t)).toEqual({ floors: 0, exact: 0 });
    for (const k of pitMap(ix, t)) {
      expect(k.source).toBe("none");
      expect(k.band).toBeUndefined();
      expect(k.population).toBeUndefined();
    }
  });

  it("watches floor 1 roughly from Watchtower 1, counts it at 2, and hears floor 2 at 3", () => {
    const t = fresh();
    const pop = t.dungeon.floors[0]!.population;
    const one = floorKnowledge(ix, tower(t, 1), 1);
    expect(one).toMatchObject({ source: "watch", band: fogBand(ix, pop / capacity(1)) });
    expect(one.population).toBeUndefined();
    expect(floorKnowledge(ix, tower(t, 1), 2).source).toBe("none");
    expect(floorKnowledge(ix, tower(t, 2), 1).population).toBe(pop);
    const two = floorKnowledge(ix, tower(t, 3), 2);
    expect(two.source).toBe("watch");
    expect(two.population).toBeUndefined();
    expect(two.band).toBe(fogBand(ix, t.dungeon.floors[1]!.population / capacity(2)));
  });

  it("a lookout on the winding gear gets a feel for floor 1", () => {
    const t = fresh();
    const on = { ...t, posts: { lookout: [t.roster[0]!.id] } };
    expect(watchRange(ix, on)).toEqual({ floors: 1, exact: 0 });
    // Not if the lookout is down below.
    expect(watchRange(ix, on, new Set([t.roster[0]!.id]))).toEqual({ floors: 0, exact: 0 });
  });

  it("a party brings home a dated feel for the floors it walked, which fades", () => {
    const t = fresh();
    const after = launchAndWait(ix, t, heroNames);
    const trip = after.lastTrip!;
    const deepest = trip.result.deepestFloor;
    const k = floorKnowledge(ix, after, deepest);
    expect(k.source).toBe("party");
    expect(k.by).toBe(trip.name);
    expect(k.day).toBeGreaterThanOrEqual(t.day);
    expect(k.band).toBeDefined();
    expect(k.population).toBeUndefined();
    expect(k.level).toBeCloseTo(after.dungeon.floors[deepest - 1]!.level, 1);
    expect(floorKnowledge(ix, after, deepest + 1).source).toBe("none");
    const old = { ...after, day: k.day! + library.scouting.staleDays + 1 };
    expect(floorKnowledge(ix, old, deepest).stale).toBe(true);
    const gone = { ...after, day: k.day! + fog.fadeDays + 1 };
    expect(floorKnowledge(ix, gone, deepest).source).toBe("none");
  });

  it("scouts' newer count beats a party's feel, and shows a number", () => {
    const t = fresh();
    const after = launchAndWait(ix, t, heroNames);
    const seen = after.sightings![1]!;
    const intel = {
      floor: 1,
      hour: 0,
      monsters: {},
      groups: 2,
      slipped: 0,
      features: [],
      hazards: [],
      lairs: [],
      rooms: 4,
      of: 6,
      level: 1.5,
      population: 15,
      day: seen.day + 1,
      by: "Scouts",
    };
    const scouted = { ...after, intel: { 1: intel } } as unknown as TownState;
    const k = floorKnowledge(ix, scouted, 1);
    expect(k).toMatchObject({ source: "scouts", population: 15, level: 1.5, by: "Scouts" });
    const older = { ...scouted, intel: { 1: { ...intel, day: seen.day - 1 } } } as TownState;
    expect(floorKnowledge(ix, older, 1).source).toBe("party");
  });
});
