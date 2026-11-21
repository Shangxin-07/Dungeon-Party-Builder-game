import { defineLootTable } from "../types";

// What an Evil party takes off a wounded stranger (content/events/).
export default defineLootTable({
  id: "strangers-purse",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 4 },
    { item: "trinket", weight: 2 },
    { item: "silver-ring", weight: 1 },
    { item: "healing-potion", weight: 1 },
  ],
});
