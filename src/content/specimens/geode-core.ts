import { defineItem } from "../types";

// A specimen: the knot of crystal at a geode hulk's middle, warm and humming.
export default defineItem({
  id: "geode-core",
  name: "Geode Heart",
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 14, monsters: ["geode-hulk"] },
});
