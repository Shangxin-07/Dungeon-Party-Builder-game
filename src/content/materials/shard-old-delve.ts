import { defineMaterial } from "../types";

// A piece of the Coalstone (M8.37, DESIGN.md §21), blown up the Keepers' Stair
// when the miners' blow cracked it too. Hotter than the Hearthstone's. Floor 5's.
export default defineMaterial({
  id: "shard-old-delve",
  name: "Coalstone shard",
  blurb:
    "A shard of the Coalstone, older and hotter than the Hearthstone's. Forge them all into floor 5's Seal Stone.",
  value: 180,
  tags: ["shard"],
});
