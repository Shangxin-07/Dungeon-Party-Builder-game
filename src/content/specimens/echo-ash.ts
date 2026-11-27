import { defineItem } from "../types";

// A specimen: a pinch of pale ash where an echo was. It smells of lamp oil and old paper.
export default defineItem({
  id: "echo-ash",
  name: "Echo's Ash",
  slot: "loot",
  value: 6,
  tags: ["specimen"],
  research: { points: 14, monsters: ["keepers-echo"] },
});
