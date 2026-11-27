import { defineLootTable } from "../types";

// What's left of an ash moth (the Coal Halls).
export default defineLootTable({
  id: "moth-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 5 },
    { item: "moth-dust", weight: 3 },
    { item: "banked-coal", weight: 1 },
  ],
});
