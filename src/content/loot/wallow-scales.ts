import { defineLootTable } from "../types";

// What a sneak party can grab from the edge of the Behemoth's wallow.
export default defineLootTable({
  id: "wallow-scales",
  rolls: [2, 3],
  entries: [
    { item: "shed-scale", weight: 5 },
    { item: "gem", weight: 1 },
  ],
});
