import { defineRoom } from "../types";

// Mining (DESIGN.md §8): iron ore for the town's walls and forge.
export default defineRoom({
  id: "ore-seam",
  name: "Ore seam",
  behaviour: "treasure",
  floors: [1, 3],
  weight: 1,
  descriptions: [
    "A seam of iron ore glints in the wall, half dug out before the miners fled.",
    "Rusted picks lie where they were dropped, next to a vein of good ore.",
  ],
  loot: "ore-seam",
});
