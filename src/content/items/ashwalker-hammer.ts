import { defineItem } from "../types";

// The Ember Deeps: a Keepers' forge hammer, its head still warm. It hits like a falling rock, and burns.
export default defineItem({
  id: "ashwalker-hammer",
  name: "Ashwalker's Hammer",
  slot: "weapon",
  value: 200,
  tags: ["mace", "melee", "heavy"],
  damageType: "crushing",
  salvage: { "iron-bands": 2 },
  passives: [
    { type: "modifyStat", stat: "attack", amount: 8 },
    { type: "modifyStat", stat: "initiative", amount: -1 },
    { type: "resist", damageType: "fire", percent: 20 },
    { type: "bonusVsTag", tag: "crystal-grown", percent: 25 },
  ],
});
