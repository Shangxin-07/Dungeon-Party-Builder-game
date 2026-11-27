import { defineItem } from "../types";

// A specimen: a curved claw of clear crystal, sharp as a razor.
export default defineItem({
  id: "stalker-claw",
  name: "Stalker's Glass Claw",
  icon: { sheet: "glimmering", cell: 8 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 14, monsters: ["glimmer-stalker"] },
});
