import { defineItem } from "../types";

// Someone carved marks into it before it got up again. What raised it?
export default defineItem({
  id: "etched-skull",
  name: "Etched Skull",
  slot: "loot",
  value: 3,
  tags: ["specimen"],
  research: { points: 8, monsters: ["skeleton", "skeleton-captain", "restless-bones"] },
});
