import { defineLootTable } from "../types";

export default defineLootTable({
  id: "beetle-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 5 },
    { item: "beetle-shell", weight: 2 },
    { item: "iron-ore", weight: 1 },
  ],
});
