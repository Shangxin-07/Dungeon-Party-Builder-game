import { defineRoom } from "../types";

export default defineRoom({
  id: "spiked-pit",
  name: "Dusty hall",
  behaviour: "trap",
  floors: [2, 5],
  weight: 1,
  descriptions: ["A wide hall with a suspiciously even floor."],
  trap: {
    springs: "The floor gives way into a spiked pit",
    spotted: "a false floor over a pit",
    hidden: 30,
    damage: [8, 12],
    damageType: "piercing",
    hits: "one",
  },
});
