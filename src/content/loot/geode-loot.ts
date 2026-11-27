import { defineLootTable } from "../types";

// A broken geode hulk (the Glimmering).
export default defineLootTable({
  id: "geode-loot",
  rolls: [1, 2],
  entries: [
    { item: "geode-core", weight: 2 },
    { item: "glimmer-crystal", weight: 2 },
    { item: "gem", weight: 2 },
    { item: "deep-silver", weight: 2 },
  ],
});
