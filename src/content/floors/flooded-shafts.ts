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
});
