import { defineFloor } from "../types";

// Act Three (§21): under the Glimmering the crystal gives out, and the rock is
// warm, then hot. The Emberstone's broken heat comes up through the cracks;
// ash lies over everything like snow, and things live in it that like it.
export default defineFloor({
  id: "ember-deeps",
  depth: 9,
  act: 3,
  name: "The Ember Deeps",
  rooms: [6, 8],
  fixedRooms: ["rest-spot"],
  capacity: 120,
  startPopulation: 60,
  evictedLevelDrop: 1,
  ground: {
    name: "Choking ash",
    description:
      "Ash hangs in the air and heat comes up through the floor: the heroes' spells come short (-3 spell power) and fire hurts them 15% more.",
    text: "Ash drifts down through their lamplight like grey snow. The floor is warm through their boots, and somewhere below it, something is burning.",
    heroes: [
      { type: "modifyStat", stat: "spellPower", amount: -3 },
      { type: "resist", damageType: "fire", percent: -15 },
    ],
  },
});
