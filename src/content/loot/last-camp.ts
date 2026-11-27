import { defineLootTable } from "../types";

// What the Keepers' last camp held (the Kiln).
export default defineLootTable({
  id: "last-camp",
  rolls: [1, 2],
  entries: [
    { item: "kiln-glass", weight: 3 },
    { item: "keepers-lamp", weight: 2 },
    { item: "kiln-fired-shield", weight: 1 },
  ],
});
