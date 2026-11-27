import { defineRoom } from "../types";

// The Ember Deeps: a floor of ash over cracks that glow when you step near them.
export default defineRoom({
  id: "ember-crack",
  name: "Ember cracks",
  behaviour: "trap",
  floors: [9, 9],
  weight: 2,
  descriptions: [
    "A hall floored with ash, smooth as snow. Here and there it glows from underneath.",
    "Cracks run across the floor, red at the bottom, and the air over them shivers with heat.",
  ],
  trap: {
    springs: "The ash gives way over a crack, and a gout of fire comes up through the party",
    spotted:
      "where the ash lies thinnest and glows. They test every step with a pole and keep to the dark patches",
    hidden: 70,
    damage: [12, 16],
    damageType: "fire",
    hits: "all",
  },
});
