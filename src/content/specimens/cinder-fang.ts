import { defineItem } from "../types";

// A specimen: a hound's tooth, still warm.
export default defineItem({
  id: "cinder-fang",
  name: "Cinder Fang",
  icon: { sheet: "keepers", cell: 8 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 12, monsters: ["cinder-hound"] },
});
