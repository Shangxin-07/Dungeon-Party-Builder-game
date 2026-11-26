import { defineLootTable } from "../types";

// A grotto the heart's life has grown full of crystal (the Old Delve).
export default defineLootTable({
  id: "crystal-grotto",
  rolls: [1, 2],
  entries: [
    { item: "heart-crystal", weight: 3 },
    { item: "gem", weight: 2 },
    { item: "deep-silver", weight: 2 },
    { item: "glowcap", weight: 2 },
    { item: "runeplate", weight: 1 },
  ],
});
