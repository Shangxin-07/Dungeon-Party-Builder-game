import { defineLootTable } from "../types";

// What a glimmer stalker leaves (the Glimmering).
export default defineLootTable({
  id: "glimmer-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "stalker-claw", weight: 3 },
    { item: "glimmer-crystal", weight: 1 },
  ],
});
