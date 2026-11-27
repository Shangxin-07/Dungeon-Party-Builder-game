import { defineLootTable } from "../types";

// What a flame dancer leaves (the Kiln).
export default defineLootTable({
  id: "dancer-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "dancer-cinder", weight: 3 },
    { item: "ember-stone", weight: 1 },
  ],
});
