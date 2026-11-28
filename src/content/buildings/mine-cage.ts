import { defineBuilding } from "../types";

/**
 * The old miners' winch and cage, rigged again over the pit (M6.21). Parties
 * ride past the top floors to save the walk, but the floors they skip don't
 * get thinned out, and their monsters still climb towards the town.
 */
export default defineBuilding({
  id: "mine-cage",
  name: "Mine Cage",
  group: "defence",
  blurb: "A winch and cage over the pit. Parties ride past the top floors, down and back up.",
  startLevel: 0,
  levels: [
    {
      cost: 300,
      materials: { "iron-ore": 8, "spider-silk": 4 },
      days: 4,
      summary: "Trips deeper than floor 1 ride past it: a day shorter",
      effects: [{ type: "lift", floors: 1 }],
    },
    {
      cost: 600,
      materials: { "iron-ore": 10, "deep-silver": 4 },
      days: 6,
      summary: "Trips deeper than floor 2 ride past floors 1 and 2: two days shorter",
      effects: [{ type: "lift", floors: 2 }],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: { shape: "headframe", sprite: { sheet: "mine-cage", frames: [0, 1] } },
});
