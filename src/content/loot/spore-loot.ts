import { defineLootTable } from "../types";

// What's left of a Sporecaller is mostly mushroom.
export default defineLootTable({
  id: "spore-loot",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 3 },
    { item: "glowcap", weight: 4 },
  ],
});
