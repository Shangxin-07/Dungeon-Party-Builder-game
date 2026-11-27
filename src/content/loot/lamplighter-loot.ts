import { defineLootTable } from "../types";

// A lamplighter's things (the Coal Halls).
export default defineLootTable({
  id: "lamplighter-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "lamp-wick", weight: 3 },
    { item: "keepers-lamp", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
