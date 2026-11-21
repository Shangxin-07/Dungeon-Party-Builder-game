import { defineLootTable } from "../types";

// A day at the near seam (content/posts/seam.ts): mostly pay, now and then ore.
export default defineLootTable({
  id: "seam-work",
  rolls: [1, 1],
  entries: [
    { item: "coins", weight: 6 },
    { item: "iron-ore", weight: 2 },
    { item: null, weight: 2 },
  ],
});
