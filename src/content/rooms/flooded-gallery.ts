import { defineRoom } from "../types";

export default defineRoom({
  id: "flooded-gallery",
  name: "Flooded gallery",
  behaviour: "trap",
  floors: [4, 5],
  weight: 1,
  descriptions: ["Black water up to the waist. The floor under it is anyone's guess."],
  trap: {
    springs: "The floor drops away into a sunken shaft and icy water closes overhead",
    spotted: "where the old shaft lies under the water, and a way round it",
    hidden: 60,
    damage: [4, 7],
    damageType: "cold",
    hits: "all",
  },
});
