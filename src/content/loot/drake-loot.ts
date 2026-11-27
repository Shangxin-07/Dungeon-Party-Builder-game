import { defineLootTable } from "../types";

// What a kiln drake leaves (the Kiln).
export default defineLootTable({
  id: "drake-loot",
  rolls: [1, 2],
  entries: [
    { item: "drake-scale", weight: 3 },
    { item: "kiln-glass", weight: 2 },
    { item: "ember-stone", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
