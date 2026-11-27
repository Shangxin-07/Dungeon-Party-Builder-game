import { defineRoom } from "../types";

// The Kiln: a flue that carries the stone's heat round the walls. Now and then it breathes out.
export default defineRoom({
  id: "kiln-flue",
  name: "Kiln flue",
  behaviour: "trap",
  floors: [10, 10],
  weight: 2,
  descriptions: [
    "A low brick tunnel, round as a pipe, black with soot. A hot wind blows through it, then stops.",
    "The passage runs between two walls of fired brick, and the air in it shimmers.",
  ],
  trap: {
    springs: "The flue breathes out, and a wave of fire rolls down the passage over the party",
    spotted:
      "the soot on the walls is fresh, and the wind comes in gusts. They count the gusts and run between them",
    hidden: 75,
    damage: [14, 18],
    damageType: "fire",
    hits: "all",
  },
});
