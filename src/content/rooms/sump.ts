import { defineRoom } from "../types";

// The Flooded Shafts: the floor drops away under the water.
export default defineRoom({
  id: "sump",
  name: "Sump",
  behaviour: "trap",
  floors: [4, 4],
  weight: 1,
  descriptions: [
    "The gallery is flooded wall to wall. The water is still and black.",
    "A low gallery, the water up to the knee and rising.",
  ],
  trap: {
    springs: "The floor drops away into an old sump and someone goes under",
    spotted: "where the floor drops away into a sump under the water",
    hidden: 50,
    damage: [6, 10],
    damageType: "cold",
    hits: "one",
  },
});
