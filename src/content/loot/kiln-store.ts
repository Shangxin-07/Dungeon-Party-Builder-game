import { defineLootTable } from "../types";

// What's left on a kiln store's shelves (the Kiln).
export default defineLootTable({
  id: "kiln-store",
  rolls: [1, 2],
  entries: [
    { item: "kiln-glass", weight: 3 },
    { item: "ember-stone", weight: 2 },
    { item: "deep-silver", weight: 2 },
    { item: "kiln-fired-shield", weight: 1 },
    { item: "greater-healing-potion", weight: 2 },
  ],
});
