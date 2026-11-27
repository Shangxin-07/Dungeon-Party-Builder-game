import { defineLootTable } from "../types";

export default defineLootTable({
  id: "echo-loot",
  rolls: [0, 1],
  entries: [
    { item: "echo-ash", weight: 3 },
    { item: "keepers-lamp", weight: 1 },
  ],
});
