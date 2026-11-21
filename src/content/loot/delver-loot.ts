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
    // Unholy (DESIGN.md §7): what the dark did to a miner's blade.
    { item: "cursed-blade", weight: 0.5 },
  ],
});
