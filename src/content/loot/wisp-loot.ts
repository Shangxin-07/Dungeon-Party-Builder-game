import { defineLootTable } from "../types";

// What's left when a wisp goes out (the Glimmering).
export default defineLootTable({
  id: "wisp-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "wisp-mote", weight: 3 },
    { item: "glimmer-crystal", weight: 1 },
  ],
});
