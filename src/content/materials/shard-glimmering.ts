import { defineMaterial } from "../types";

// A piece of the Emberstone (M8.40, DESIGN.md §21), grown into the crystal of
// the Glimmering. Floor 8's: nine of them, like floor 7's.
export default defineMaterial({
  id: "shard-glimmering",
  name: "Emberstone shard",
  blurb:
    "A shard of the Emberstone, with crystal grown over one face of it like frost. Forge all nine into floor 8's Seal Stone.",
  value: 240,
  tags: ["shard"],
});
