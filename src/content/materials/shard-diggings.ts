import { defineMaterial } from "../types";

// A piece of the broken Hearthstone (DESIGN.md §20), warm to the touch. Floor 1's.
export default defineMaterial({
  id: "shard-diggings",
  name: "Diggings shard",
  blurb: "A shard of the Hearthstone from the Diggings. Forge them all into floor 1's Seal Stone.",
  // Worth more than anything else in the packs: nobody leaves one behind, and a
  // porter running for it grabs it first.
  value: 150,
  tags: ["shard"],
});
