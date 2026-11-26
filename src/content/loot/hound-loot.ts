import { defineLootTable } from "../types";

export default defineLootTable({
  id: "hound-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 6 },
    { item: "hound-tooth", weight: 2 },
    { item: "trinket", weight: 1 },
  ],
});
