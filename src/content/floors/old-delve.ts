import { defineFloor } from "../types";

// The bottom of the mine: the gallery the town dug too deep into. The miners never left.
export default defineFloor({
  id: "old-delve",
  depth: 5,
  name: "The Old Delve",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 80,
  startPopulation: 80,
  evictedLevelDrop: 1,
});
