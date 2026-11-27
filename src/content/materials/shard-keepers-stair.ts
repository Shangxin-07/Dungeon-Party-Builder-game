import { defineMaterial } from "../types";

// A piece of the Coalstone (M8.38, DESIGN.md §21) from the Keepers' Stair and the halls below. Floor 6's.
export default defineMaterial({
  id: "shard-keepers-stair",
  name: "Keepers' Stair shard",
  blurb:
    "A shard of the Coalstone from the Keepers' Stair, too hot to hold for long. Forge them all into floor 6's Seal Stone.",
  value: 200,
  tags: ["shard"],
});
