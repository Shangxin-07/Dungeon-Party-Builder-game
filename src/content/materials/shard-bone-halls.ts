import { defineMaterial } from "../types";

// A piece of the broken Hearthstone (DESIGN.md §20), warm to the touch. Floor 3's.
export default defineMaterial({
  id: "shard-bone-halls",
  name: "Bone Halls shard",
  icon: { sheet: "specimens", cell: 15 },
  blurb:
    "A shard of the Hearthstone from the Bone Halls. Forge them all into floor 3's Seal Stone.",
  // Worth more than anything else in the packs: nobody leaves one behind, and a
  // porter running for it grabs it first.
  value: 150,
  tags: ["shard"],
});
