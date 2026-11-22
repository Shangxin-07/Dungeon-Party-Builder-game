import { defineLootTable } from "../types";

// Everything the Behemoth swallowed and couldn't digest, at the bottom of its wallow.
export default defineLootTable({
  id: "behemoth-hoard",
  rolls: [6, 9],
  entries: [
    { item: "coins", weight: 3 },
    { item: "gem", weight: 3 },
    { item: "silver-ring", weight: 2 },
    { item: "deep-silver", weight: 3 },
    { item: "shed-scale", weight: 2 },
    { item: "trinket", weight: 1 },
  ],
});
