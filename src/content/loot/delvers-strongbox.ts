import { defineLootTable } from "../types";

// The old mine's pay chest, never handed out.
export default defineLootTable({
  id: "delvers-strongbox",
  rolls: [2, 3],
  entries: [
    { item: "coins", weight: 4 },
    { item: "gem", weight: 2 },
    { item: "deep-silver", weight: 2 },
    { item: "silver-ring", weight: 1 },
    { item: "healing-potion", weight: 1 },
  ],
});
