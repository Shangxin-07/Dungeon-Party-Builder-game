import { defineFloor } from "../types";

// Act Two (§21): the Keepers' own halls round the Coalstone. They kept it fed
// and warm here, for longer than anyone can count, and then they stopped.
// The heat never did.
export default defineFloor({
  id: "coal-halls",
  depth: 7,
  act: 2,
  name: "The Coal Halls",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 100,
  startPopulation: 50,
  evictedLevelDrop: 1,
  ground: {
    name: "Banked heat",
    description:
      "The halls are hot as a forge: fire hurts the heroes a fifth more, and the things that live here hate the cold (it hurts them a fifth more).",
    text: "The heat comes up through their boots. Every breath tastes of coal.",
    heroes: [{ type: "resist", damageType: "fire", percent: -20 }],
    monsters: [{ type: "resist", damageType: "cold", percent: -20 }],
  },
});
