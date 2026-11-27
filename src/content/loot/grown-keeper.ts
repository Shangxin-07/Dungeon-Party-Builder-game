import { defineLootTable } from "../types";

// Crystal broken off a grown-over Keeper (the Glimmering).
export default defineLootTable({
  id: "grown-keeper",
  rolls: [1, 2],
  entries: [
    { item: "glimmer-crystal", weight: 3 },
    { item: "keepers-lamp", weight: 1 },
  ],
});
