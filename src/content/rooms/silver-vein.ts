import { defineRoom } from "../types";

// Deep silver (M6.21) for the Blacksmith's best steel and the Mine Cage.
export default defineRoom({
  id: "silver-vein",
  name: "Silver vein",
  behaviour: "treasure",
  floors: [4, 5],
  weight: 2,
  descriptions: [
    "A vein of bright silver runs through the wall, half worked. This is what they were digging for.",
    "Picks and a rotten ore cart, left beside a seam of deep silver.",
  ],
  loot: "silver-vein",
});
