import { defineLootTable } from "../types";

// A troll's ledge: everything shiny it ever took off anyone.
export default defineLootTable({
  id: "troll-loot",
  rolls: [1, 2],
  entries: [
    { item: null, weight: 1.5 },
    { item: "troll-tooth", weight: 0.5 },
    { item: "coins", weight: 3 },
    { item: "gem", weight: 2 },
    { item: "iron-ore", weight: 1 },
    { item: "deep-silver", weight: 2 },
    { item: "trinket", weight: 1 },
  ],
});
