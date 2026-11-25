import { defineMaterial } from "../types";

// A piece of the broken Hearthstone (DESIGN.md §20), warm to the touch. Floor 2's.
export default defineMaterial({
  id: "shard-warrens",
  name: "Warrens shard",
  blurb: "A shard of the Hearthstone from the Warrens. Forge them all into floor 2's Seal Stone.",
  // Worth more than anything else in the packs: nobody leaves one behind, and a
  // porter running for it grabs it first.
  value: 150,
  tags: ["shard"],
});
