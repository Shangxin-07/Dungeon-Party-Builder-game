import { defineItem } from "../types";

// A specimen: a hooked tooth as long as a hand, hot to hold.
export default defineItem({
  id: "worm-tooth",
  name: "Ember Worm's Tooth",
  icon: { sheet: "ember-deeps", cell: 10 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 16, monsters: ["ember-worm"] },
});
