import { defineLootTable } from "../types";

export default defineLootTable({
  id: "small-chest",
  rolls: [1, 3],
  entries: [
    { item: "coins", weight: 5 },
    { item: "rusty-helmet", weight: 3 },
    { item: "gem", weight: 2 },
    { item: "trinket", weight: 2 },
    { item: "silver-ring", weight: 2 },
    { item: "bandages", weight: 2 },
    { item: "healing-potion", weight: 1 },
  ],
});
