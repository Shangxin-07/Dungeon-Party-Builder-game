import { defineLootTable } from "../types";

// What a clinker golem leaves (the Kiln).
export default defineLootTable({
  id: "clinker-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "clinker-brick", weight: 3 },
    { item: "kiln-glass", weight: 1 },
    { item: "iron-bands", weight: 1 },
  ],
});
