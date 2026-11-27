import { defineRoom } from "../types";

// The Keepers' Stair: an alcove off the stair where someone kept their things.
export default defineRoom({
  id: "keepers-alcove",
  name: "Keepers' alcove",
  behaviour: "treasure",
  floors: [6, 6],
  weight: 2,
  descriptions: [
    "A dry alcove off the stair with a stone shelf, and things still on it.",
    "A little room cut into the rock, neat as a pantry. Nobody has been in it for a very long time.",
  ],
  loot: "keepers-alcove",
});
