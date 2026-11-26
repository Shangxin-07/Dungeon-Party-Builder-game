import { defineLootTable } from "../types";

export default defineLootTable({
  id: "golem-loot",
  rolls: [1, 2],
  entries: [
    { item: "deep-silver", weight: 3 },
    { item: "iron-ore", weight: 3 },
    { item: "golem-rune", weight: 2 },
    { item: "heart-crystal", weight: 1 },
  ],
});
