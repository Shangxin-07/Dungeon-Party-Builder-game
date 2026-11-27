import { defineMaterial } from "../types";

// A piece of the Emberstone (M8.39, DESIGN.md §21), blown all the way up through
// the Glimmering into the Coal Halls. Floor 7's: nine of them, the most yet.
export default defineMaterial({
  id: "shard-coal-halls",
  name: "Emberstone shard",
  icon: { sheet: "glimmering", cell: 11 },
  blurb:
    "A shard of the Emberstone, the oldest stone of all: it burns white at the edges. Forge all nine into floor 7's Seal Stone.",
  value: 220,
  tags: ["shard"],
});
