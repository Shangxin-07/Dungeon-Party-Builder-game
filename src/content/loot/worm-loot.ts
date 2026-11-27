import { defineLootTable } from "../types";

// What an ember worm leaves (the Ember Deeps).
export default defineLootTable({
  id: "worm-loot",
  rolls: [1, 2],
  entries: [
    { item: "worm-tooth", weight: 3 },
    { item: "slag-iron", weight: 2 },
    { item: "ember-stone", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
