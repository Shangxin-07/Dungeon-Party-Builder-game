import { defineLootTable } from "../types";

// Ghouls drag back whatever their meals were carrying.
export default defineLootTable({
  id: "ghoul-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "coins", weight: 2 },
    { item: "trinket", weight: 2 },
    { item: "silver-ring", weight: 1 },
    { item: "bone-dust", weight: 2 },
  ],
});
