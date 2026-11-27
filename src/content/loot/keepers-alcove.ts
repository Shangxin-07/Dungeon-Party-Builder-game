import { defineLootTable } from "../types";

// An alcove where a Keeper kept their things (the Keepers' Stair).
export default defineLootTable({
  id: "keepers-alcove",
  rolls: [1, 2],
  entries: [
    { item: "keepers-lamp", weight: 3 },
    { item: "ember-stone", weight: 2 },
    { item: "gem", weight: 2 },
    { item: "ward-cloak", weight: 1 },
    { item: "greater-healing-potion", weight: 2 },
  ],
});
