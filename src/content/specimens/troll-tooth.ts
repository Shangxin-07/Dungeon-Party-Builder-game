import { defineItem } from "../types";

// Big as a fist, and it grows back. The Library wants to know how.
export default defineItem({
  id: "troll-tooth",
  name: "Troll Tooth",
  slot: "loot",
  value: 4,
  tags: ["specimen"],
  research: { points: 20, monsters: ["cave-troll"] },
});
