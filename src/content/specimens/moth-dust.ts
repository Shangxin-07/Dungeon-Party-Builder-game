import { defineItem } from "../types";

// A specimen: a pinch of grey dust off a moth's wing, still warm.
export default defineItem({
  id: "moth-dust",
  name: "Ash Moth Dust",
  icon: { sheet: "coal-halls", cell: 9 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 10, monsters: ["ash-moth"] },
});
