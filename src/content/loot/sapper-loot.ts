import { defineLootTable } from "../types";

export default defineLootTable({
  id: "sapper-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "goblin-ear", weight: 1 },
    { item: "coins", weight: 3 },
    { item: "iron-ore", weight: 1 },
    { item: "miners-lamp", weight: 1 },
  ],
});
