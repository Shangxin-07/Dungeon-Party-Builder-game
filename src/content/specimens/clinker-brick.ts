import { defineItem } from "../types";

// A specimen: a brick from a clinker golem, with a Keepers' mark pressed into it.
export default defineItem({
  id: "clinker-brick",
  name: "Clinker Golem's Brick",
  icon: { sheet: "kiln", cell: 9 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 17, monsters: ["clinker-golem"] },
});
