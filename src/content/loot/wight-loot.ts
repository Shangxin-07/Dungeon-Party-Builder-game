import { defineLootTable } from "../types";

export default defineLootTable({
  id: "wight-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "wight-shroud", weight: 2 },
    { item: "coins", weight: 2 },
    { item: "bone-dust", weight: 1 },
    { item: "silver-ring", weight: 1 },
  ],
});
