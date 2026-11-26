import { defineRoom } from "../types";

// The Bone Halls: skulls stacked to the roof, and none too steady.
export default defineRoom({
  id: "bone-stacks",
  name: "Charnel gallery",
  behaviour: "trap",
  floors: [3, 3],
  weight: 1,
  descriptions: [
    "A gallery walled with skulls and long bones, stacked to the roof.",
    "Bones packed into every niche, and more piled on the floor.",
  ],
  trap: {
    springs: "A wall of stacked bones gives way and buries the party",
    spotted: "a wall of stacked bones leaning out over the path",
    hidden: 50,
    damage: [3, 6],
    damageType: "crushing",
    hits: "all",
  },
});
