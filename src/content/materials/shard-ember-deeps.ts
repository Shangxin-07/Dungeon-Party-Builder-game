import { defineMaterial } from "../types";

// A piece of the Emberstone (M8.41, DESIGN.md §21), the last nine, found in
// the ash of the Ember Deeps and the Kiln itself. Floor 9's.
export default defineMaterial({
  id: "shard-ember-deeps",
  name: "Emberstone shard",
  blurb:
    "A shard of the Emberstone, still hot after all this time, ash caught in its cracks. Forge all nine into floor 9's Seal Stone.",
  value: 260,
  tags: ["shard"],
});
