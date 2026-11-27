import { defineLootTable } from "../types";

// What a stoker carries (the Coal Halls).
export default defineLootTable({
  id: "stoker-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "stokers-tag", weight: 2 },
    { item: "banked-coal", weight: 2 },
    { item: "iron-ore", weight: 2 },
    { item: "stokers-apron", weight: 1 },
  ],
});
