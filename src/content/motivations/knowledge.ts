import { defineMotivation } from "../types";

export default defineMotivation({
  id: "knowledge",
  name: "Knowledge",
  blurb: "Went down the pit to see what's at the bottom.",
  weight: 1,
  rules: [
    { fact: "newFloors", amount: 5, cap: 10, reason: "saw a new floor" },
    { fact: "newMonsters", amount: 2, cap: 6, reason: "met new kinds of monster" },
    { fact: "sameOldFloor", amount: -4, reason: "has seen it all before" },
  ],
  favourites: [
    { building: "library", weight: 3 },
    { building: "watchtower", weight: 1 },
  ],
});
