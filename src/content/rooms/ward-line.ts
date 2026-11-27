import { defineRoom } from "../types";

// The Keepers' Stair: a ward cut across the steps. It still burns whatever it doesn't know.
export default defineRoom({
  id: "ward-line",
  name: "Ward-cut landing",
  behaviour: "trap",
  floors: [6, 6],
  weight: 2,
  descriptions: [
    "A landing with lines cut across it, deep and even, that nobody in the mine could have made.",
    "The steps are worn smooth except for a band of carving that runs wall to wall.",
  ],
  trap: {
    springs: "The carved line wakes with a flash of white fire",
    spotted: "a carved line across the steps, faintly glowing. They step over it one at a time",
    hidden: 60,
    damage: [6, 10],
    damageType: "fire",
    hits: "all",
  },
});
