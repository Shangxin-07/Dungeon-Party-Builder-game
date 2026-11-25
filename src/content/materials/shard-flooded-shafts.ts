import { defineMaterial } from "../types";

// A piece of the broken Hearthstone (DESIGN.md §20), warm to the touch. Floor 4's.
export default defineMaterial({
  id: "shard-flooded-shafts",
  name: "Flooded Shafts shard",
  blurb:
    "A shard of the Hearthstone from the Flooded Shafts. Forge them all into floor 4's Seal Stone.",
  // Worth more than anything else in the packs: nobody leaves one behind, and a
  // porter running for it grabs it first.
  value: 150,
  tags: ["shard"],
});
