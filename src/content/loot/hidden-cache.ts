import { defineLootTable } from "../types";

// What someone thought worth hiding: small, and worth more than a chest's junk.
export default defineLootTable({
  id: "hidden-cache",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 6 },
    { item: "gem", weight: 2 },
    { item: "silver-ring", weight: 3 },
    { item: "trinket", weight: 2 },
  ],
});
