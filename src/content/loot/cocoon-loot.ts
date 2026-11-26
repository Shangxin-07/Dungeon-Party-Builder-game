import { defineLootTable } from "../types";

// What a cocooned delver had on them (room cocooned-delver).
export default defineLootTable({
  id: "cocoon-loot",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 4 },
    { item: "spider-silk", weight: 3 },
    { item: "dagger", weight: 2 },
    { item: "antivenom", weight: 2 },
    { item: "silver-ring", weight: 1 },
    { item: "silk-cloak", weight: 1 },
  ],
});
