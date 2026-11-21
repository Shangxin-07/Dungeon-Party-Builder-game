import { defineLootTable } from "../types";

// A seam the miners never got to. Whoever has the strongest arm digs it out.
export default defineLootTable({
  id: "ore-seam",
  rolls: [1, 2],
  entries: [
    { item: "iron-ore", weight: 8 },
    { item: "gem", weight: 1 },
  ],
});
