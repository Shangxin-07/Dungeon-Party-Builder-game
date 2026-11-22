import { defineLootTable } from "../types";

export default defineLootTable({
  id: "goblin-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "goblin-ear", weight: 1 },
    { item: "coins", weight: 4 },
    { item: "rusty-helmet", weight: 2 },
    { item: "dagger", weight: 1 },
    { item: "iron-ore", weight: 1 },
  ],
});
