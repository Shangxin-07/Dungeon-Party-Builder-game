import { defineLootTable } from "../types";

// What's on and under a cold forge's anvil (the Ember Deeps).
export default defineLootTable({
  id: "cold-forge",
  rolls: [1, 2],
  entries: [
    { item: "slag-iron", weight: 3 },
    { item: "iron-bands", weight: 2 },
    { item: "ashwalker-hammer", weight: 1 },
  ],
});
