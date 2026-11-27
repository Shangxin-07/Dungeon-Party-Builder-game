import { defineItem } from "../types";

// A specimen: a scale like a fired roof tile, still warm.
export default defineItem({
  id: "drake-scale",
  name: "Kiln Drake's Scale",
  icon: { sheet: "kiln", cell: 11 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 18, monsters: ["kiln-drake"] },
});
