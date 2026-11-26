import { defineFloor } from "../types";

// The bottom of the mine: the gallery the town dug too deep into. The miners never left.
export default defineFloor({
  id: "old-delve",
  depth: 5,
  name: "The Old Delve",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 80,
  startPopulation: 80,
  evictedLevelDrop: 1,
  // Nearest the heart: its life runs through everything down here (§21).
  ground: {
    name: "The heart's warmth",
    description:
      "The heart's life runs through everything this deep: the monsters are tougher (+1 armour), but holy light burns them a little more.",
    text: "The rock is warm here, and the heart beats somewhere below.",
    monsters: [
      { type: "modifyStat", stat: "armor", amount: 1 },
      { type: "resist", damageType: "holy", percent: -15 },
    ],
  },
});
