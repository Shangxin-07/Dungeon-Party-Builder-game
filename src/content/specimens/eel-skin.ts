import { defineItem } from "../types";

// A specimen: a strip of pale eel-skin. The Library learns what lives in the drowned galleries.
export default defineItem({
  id: "eel-skin",
  name: "Eel Skin",
  slot: "loot",
  value: 4,
  tags: ["specimen"],
  research: { points: 8, monsters: ["shaft-eel", "leech"] },
});
