import { defineItem } from "../types";

// The Glimmering: a point of living crystal, still holding a little light.
export default defineItem({
  id: "glimmer-crystal",
  name: "Glimmer Crystal",
  icon: { sheet: "glimmering", cell: 6 },
  slot: "loot",
  value: 110,
  tags: ["gem", "valuable"],
});
