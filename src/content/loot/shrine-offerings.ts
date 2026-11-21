import { defineLootTable } from "../types";

// What miners left at their shrine: taken by an Evil party, or, now and then,
// a relic given to a Good one that prays there (content/events/).
export default defineLootTable({
  id: "shrine-offerings",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 4 },
    { item: "gem", weight: 1 },
    { item: "silver-ring", weight: 1 },
    { item: "holy-symbol", weight: 1 },
  ],
});
