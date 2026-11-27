import { defineFloor } from "../types";

// Act Three (§21), the bottom: the Kiln, a great round chamber the Keepers
// built round the Emberstone to hold its heat, like a potter's kiln round a
// fire. Everything in it has been fired hard, the monsters too.
export default defineFloor({
  id: "kiln",
  depth: 10,
  act: 3,
  name: "The Kiln",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 130,
  startPopulation: 65,
  evictedLevelDrop: 1,
  ground: {
    name: "Kiln heat",
    description:
      "The air itself burns: fire hurts the heroes 15% more, and everything that lives here has been fired as hard as a pot (+1 armour).",
    text: "The heat comes off the curved brick walls like an open oven door. Their lamps are hardly needed: everything glows.",
    heroes: [{ type: "resist", damageType: "fire", percent: -15 }],
    monsters: [{ type: "modifyStat", stat: "armor", amount: 1 }],
  },
});
