import { defineLootTable } from "../types";

// What an ash wraith leaves (the Ember Deeps).
export default defineLootTable({
  id: "wraith-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "wraith-ash", weight: 3 },
    { item: "ember-stone", weight: 1 },
  ],
});
