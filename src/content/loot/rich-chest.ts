import { defineLootTable } from "../types";

export default defineLootTable({
  id: "rich-chest",
  rolls: [2, 4],
  entries: [
    { item: "coins", weight: 3 },
    { item: "gem", weight: 3 },
    { item: "trinket", weight: 3 },
    { item: "silver-ring", weight: 3 },
    { item: "rusty-helmet", weight: 2 },
    { item: "healing-potion", weight: 2 },
  ],
});
