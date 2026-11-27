import { defineLootTable } from "../types";

// Things dug out of a slag heap (the Ember Deeps).
export default defineLootTable({
  id: "slag-heap",
  rolls: [1, 2],
  entries: [
    { item: "slag-iron", weight: 3 },
    { item: "ember-stone", weight: 2 },
    { item: "deep-silver", weight: 2 },
    { item: "ashwalker-hammer", weight: 1 },
    { item: "greater-healing-potion", weight: 2 },
  ],
});
