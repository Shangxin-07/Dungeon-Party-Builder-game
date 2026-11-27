import { defineRoom } from "../types";

// The Coal Halls: a long hall where the Keepers ate and slept, left as if they meant to come back.
export default defineRoom({
  id: "keepers-hall",
  name: "Keepers' hall",
  behaviour: "treasure",
  floors: [7, 7],
  weight: 2,
  descriptions: [
    "A long hall with a stone table down the middle, and bowls still set out on it.",
    "Bunks cut into the walls, each with a shelf. Some of the shelves still have things on them.",
  ],
  loot: "keepers-hall",
});
