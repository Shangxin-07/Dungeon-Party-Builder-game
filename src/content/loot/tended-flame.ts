import { defineLootTable } from "../types";

// The stone a Keeper's flame burned on.
export default defineLootTable({
  id: "tended-flame",
  rolls: [1, 1],
  entries: [{ item: "ember-stone", weight: 1 }],
});
