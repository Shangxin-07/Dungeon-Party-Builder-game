import { defineFloor } from "../types";

// Act Two (§21): under the still heart, stairs cut long before the mine. The
// Keepers' wards still work, here and there: they keep the deep's heat off
// whoever walks the stair, but their own wardens still walk it too.
export default defineFloor({
  id: "keepers-stair",
  depth: 6,
  act: 2,
  name: "The Keepers' Stair",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 90,
  startPopulation: 45,
  evictedLevelDrop: 1,
  ground: {
    name: "Half-working wards",
    description:
      "The Keepers' wards still flicker along the stair: they keep the deep's heat off the heroes (fire hurts them a quarter less), and the old wardens are harder to hurt (+1 armour).",
    text: "Lines cut in the steps glow faintly as the party passes. The air is cooler than it should be.",
    heroes: [{ type: "resist", damageType: "fire", percent: 25 }],
    monsters: [{ type: "modifyStat", stat: "armor", amount: 1 }],
  },
});
