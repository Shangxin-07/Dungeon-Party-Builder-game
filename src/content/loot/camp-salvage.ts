import { defineLootTable } from "../types";

// A day's salvage round the camp (content/posts/salvage.ts).
export default defineLootTable({
  id: "camp-salvage",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "timber", weight: 6 },
    { item: "iron-ore", weight: 1 },
  ],
});
