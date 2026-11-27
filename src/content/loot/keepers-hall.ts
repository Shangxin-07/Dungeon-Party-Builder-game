import { defineLootTable } from "../types";

// Things the Keepers left on their shelves (the Coal Halls).
export default defineLootTable({
  id: "keepers-hall",
  rolls: [1, 2],
  entries: [
    { item: "banked-coal", weight: 3 },
    { item: "keepers-lamp", weight: 2 },
    { item: "gem", weight: 2 },
    { item: "ember-stone", weight: 2 },
    { item: "stokers-apron", weight: 1 },
    { item: "greater-healing-potion", weight: 2 },
  ],
});
