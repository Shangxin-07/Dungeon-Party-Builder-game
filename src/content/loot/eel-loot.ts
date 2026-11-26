import { defineLootTable } from "../types";

export default defineLootTable({
  id: "eel-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 6 },
    { item: "eel-skin", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
