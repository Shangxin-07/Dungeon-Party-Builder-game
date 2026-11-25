import { defineLootTable } from "../types";

// What's left in the Diggings' tool stores.
export default defineLootTable({
  id: "miners-tools",
  rolls: [1, 2],
  entries: [
    { item: "iron-ore", weight: 2 },
    { item: "rusty-helmet", weight: 3 },
    { item: "pick-axe", weight: 2 },
    { item: "bandages", weight: 2 },
    { item: "miners-lamp", weight: 2 },
    { item: "crossbow", weight: 1 },
    { item: "coins", weight: 2 },
  ],
});
