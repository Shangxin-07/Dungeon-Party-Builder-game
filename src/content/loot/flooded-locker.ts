import { defineLootTable } from "../types";

// A miners' locker in the Flooded Shafts, under the water line.
export default defineLootTable({
  id: "flooded-locker",
  rolls: [1, 2],
  entries: [
    { item: "coins", weight: 4 },
    { item: "glowcap", weight: 2 },
    { item: "iron-bands", weight: 2 },
    { item: "oilskins", weight: 2 },
    { item: "greater-healing-potion", weight: 1 },
    { item: "harpoon", weight: 1 },
  ],
});
