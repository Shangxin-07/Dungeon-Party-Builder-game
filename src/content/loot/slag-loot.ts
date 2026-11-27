import { defineLootTable } from "../types";

// What a slag crawler leaves (the Ember Deeps).
export default defineLootTable({
  id: "slag-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "slag-scale", weight: 3 },
    { item: "slag-iron", weight: 1 },
  ],
});
