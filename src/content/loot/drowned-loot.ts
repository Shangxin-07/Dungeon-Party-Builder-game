import { defineLootTable } from "../types";

export default defineLootTable({
  id: "drowned-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "miners-tag", weight: 2 },
    { item: "coins", weight: 2 },
    { item: "iron-ore", weight: 1 },
    { item: "pick-axe", weight: 1 },
  ],
});
