import { defineItem } from "../types";

// A specimen (M7.07): the Library learns how goblins fight from what's left of one.
export default defineItem({
  id: "goblin-ear",
  name: "Goblin's Ear",
  slot: "loot",
  value: 2,
  tags: ["specimen"],
  research: { points: 6, monsters: ["goblin", "goblin-archer", "goblin-boss"] },
});
