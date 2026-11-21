import { defineLootTable } from "../types";

// The Lost Delvers still carry the last of what they dug.
export default defineLootTable({
  id: "delver-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "deep-silver", weight: 2 },
    { item: "coins", weight: 2 },
    { item: "gem", weight: 1 },
    { item: "trinket", weight: 1 },
  ],
});
