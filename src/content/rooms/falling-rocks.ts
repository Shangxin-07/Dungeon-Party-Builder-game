import { defineRoom } from "../types";

export default defineRoom({
  id: "falling-rocks",
  name: "Cracked gallery",
  behaviour: "trap",
  floors: [1, 5],
  weight: 1,
  descriptions: ["An old mine gallery. The roof props are rotten through."],
  trap: {
    springs: "A prop gives way and the roof comes down",
    spotted: "a loose prop that would bring the roof down",
    hidden: 55,
    damage: [3, 6],
    damageType: "crushing",
    hits: "all",
  },
});
