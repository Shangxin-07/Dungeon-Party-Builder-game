import { defineLootTable } from "../types";

// Whatever the spider's last meal was carrying.
export default defineLootTable({
  id: "spider-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 5 },
    { item: "spider-silk", weight: 2 },
    { item: "gem", weight: 1 },
    { item: "trinket", weight: 1 },
  ],
});
