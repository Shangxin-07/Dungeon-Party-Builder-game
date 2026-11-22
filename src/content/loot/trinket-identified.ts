import { defineLootTable } from "../types";

// What a strange trinket turns out to be once the Library has studied it (M7.07).
export default defineLootTable({
  id: "trinket-identified",
  rolls: [1, 1],
  entries: [
    { item: "tin-charm", weight: 3 },
    { item: "silver-ring", weight: 2 },
    { item: "gem", weight: 2 },
    { item: "lucky-charm", weight: 2 },
    { item: "ward-stone", weight: 1 },
  ],
});
