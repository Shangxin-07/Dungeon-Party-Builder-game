import { defineRoom } from "../types";

// The Coal Halls: a chute where the coal came down to the halls. Some of it is still burning.
export default defineRoom({
  id: "coal-chute",
  name: "Coal chute",
  behaviour: "trap",
  floors: [7, 7],
  weight: 2,
  descriptions: [
    "A wide stone chute comes down out of the dark into a heap of black coal.",
    "The floor here is ankle-deep in coal dust, and the chute above it is still warm.",
  ],
  trap: {
    springs: "Something shifts up the chute, and a slide of burning coal comes down on them",
    spotted: "coal trickling down the chute, glowing. They wait until it settles and go round",
    hidden: 60,
    damage: [8, 12],
    damageType: "fire",
    hits: "all",
  },
});
