import { defineFloor } from "../types";

// Act Three (§21): under the banked Coalstone, living crystal has grown round
// the deep stones for longer than there have been people. It holds the light
// and throws it back, and things live in it that are made of the same stuff.
export default defineFloor({
  id: "glimmering",
  depth: 8,
  act: 3,
  name: "The Glimmering",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 110,
  startPopulation: 55,
  evictedLevelDrop: 1,
  ground: {
    name: "Thrown light",
    description:
      "Light comes off every face of the crystal at once: the heroes' blows go astray (-2 accuracy), but holy light runs through the crystal-grown things (holy hurts them 15% more).",
    text: "Their lamps light a thousand faces of crystal, and a thousand more beyond those. Nothing is quite where it looks.",
    heroes: [{ type: "modifyStat", stat: "accuracy", amount: -2 }],
    monsters: [{ type: "resist", damageType: "holy", percent: -15 }],
  },
});
