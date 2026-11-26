import { defineLootTable } from "../types";

export default defineLootTable({
  id: "crawler-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 4 },
    { item: "crystal-chip", weight: 2 },
    { item: "heart-crystal", weight: 1 },
    { item: "gem", weight: 1 },
  ],
});
