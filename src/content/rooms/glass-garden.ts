import { defineRoom } from "../types";

// The Glimmering: a hall grown thick with crystal spines, humming. Touch one and they all ring.
export default defineRoom({
  id: "glass-garden",
  name: "Glass garden",
  behaviour: "trap",
  floors: [8, 8],
  weight: 2,
  descriptions: [
    "A hall grown thick with crystal spines, some taller than a man, all humming the same note.",
    "Crystal grows here like a garden of glass, so thick the path winds between the spines.",
  ],
  trap: {
    springs: "A boot clips a spine, and the whole garden rings and bursts into flying glass",
    spotted:
      "how the spines hum louder as anyone comes near. They pick a slow way through, touching nothing",
    hidden: 65,
    damage: [10, 14],
    damageType: "piercing",
    hits: "all",
  },
});
