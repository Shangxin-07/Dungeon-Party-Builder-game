import { defineLootTable } from "../types";

// Coals raked out of a banked hearth (the Coal Halls).
export default defineLootTable({
  id: "banked-hearth",
  rolls: [1, 2],
  entries: [
    { item: "banked-coal", weight: 3 },
    { item: "ember-stone", weight: 1 },
  ],
});
