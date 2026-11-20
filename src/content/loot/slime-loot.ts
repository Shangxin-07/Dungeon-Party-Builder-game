import { defineLootTable } from "../types";

// Things that didn't dissolve.
export default defineLootTable({
  id: "slime-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 6 },
    { item: "coins", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
