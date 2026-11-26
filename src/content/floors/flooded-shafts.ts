import { defineFloor } from "../types";

// Where the miners hit water and kept digging. Ghouls, trolls and spore beds.
export default defineFloor({
  id: "flooded-shafts",
  depth: 4,
  name: "The Flooded Shafts",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 70,
  // Starts full, so the bottom floor's breeding reaches the pit as it always did.
  startPopulation: 70,
  evictedLevelDrop: 1,
  // Everything down here is soaked, and the party wades (§21).
  ground: {
    name: "Knee-deep water",
    description:
      "The party wades, and everything down here is soaked: heroes are slower (-2 initiative) and fire does a quarter less to the monsters.",
    text: "The party fights knee-deep in black water.",
    heroes: [{ type: "modifyStat", stat: "initiative", amount: -2 }],
    monsters: [{ type: "resist", damageType: "fire", percent: 25 }],
  },
});
