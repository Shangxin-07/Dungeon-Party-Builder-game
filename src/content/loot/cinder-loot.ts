import { defineLootTable } from "../types";

export default defineLootTable({
  id: "cinder-loot",
  rolls: [0, 1],
  entries: [
    { item: "cinder-fang", weight: 3 },
    { item: "ember-stone", weight: 1 },
  ],
});
