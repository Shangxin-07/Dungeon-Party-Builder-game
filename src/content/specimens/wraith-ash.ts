import { defineItem } from "../types";

// A specimen: a pinch of ash that still holds a shape, sealed in a jar.
export default defineItem({
  id: "wraith-ash",
  name: "Wraith Ash",
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 13, monsters: ["ash-wraith"] },
});
