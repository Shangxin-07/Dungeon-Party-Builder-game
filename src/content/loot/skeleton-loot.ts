import { defineLootTable } from "../types";

export default defineLootTable({
  id: "skeleton-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "coins", weight: 2 },
    { item: "rusty-helmet", weight: 3 },
    { item: "trinket", weight: 1 },
  ],
});
