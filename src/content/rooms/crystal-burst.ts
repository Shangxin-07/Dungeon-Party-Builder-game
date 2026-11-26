import { defineRoom } from "../types";

// The Old Delve: crystal under strain, ready to burst.
export default defineRoom({
  id: "crystal-burst",
  name: "Singing gallery",
  behaviour: "trap",
  floors: [5, 5],
  weight: 1,
  descriptions: [
    "A gallery lined with crystal that rings faintly as the party walks.",
    "Thin crystal spires, humming in the warm air.",
  ],
  trap: {
    springs: "A crystal spire cracks and bursts, and shards fly through the gallery",
    spotted: "a crystal spire humming loud enough to crack",
    hidden: 55,
    damage: [5, 9],
    damageType: "piercing",
    hits: "all",
  },
});
