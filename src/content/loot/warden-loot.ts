import { defineLootTable } from "../types";

export default defineLootTable({
  id: "warden-loot",
  rolls: [1, 2],
  entries: [
    { item: "warden-core", weight: 3 },
    { item: "deep-silver", weight: 2 },
    { item: "iron-ore", weight: 2 },
    { item: "warden-maul", weight: 1 },
  ],
});
