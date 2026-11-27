import { defineItem } from "../types";

// The Keepers' Stair: a stone that holds a flame. It never cools.
export default defineItem({
  id: "ember-stone",
  name: "Ember Stone",
  icon: { sheet: "keepers", cell: 3 },
  slot: "loot",
  value: 90,
  valueRange: [60, 130],
  tags: ["gem", "valuable"],
});
