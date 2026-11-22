import { defineLootTable } from "../types";

export default defineLootTable({
  id: "skeleton-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "etched-skull", weight: 1 },
    { item: "coins", weight: 2 },
    { item: "rusty-helmet", weight: 3 },
    { item: "trinket", weight: 1 },
    { item: "bone-dust", weight: 2 },
  ],
});
