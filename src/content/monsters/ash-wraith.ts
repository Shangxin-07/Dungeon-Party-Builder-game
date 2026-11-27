import { defineMonster } from "../types";

// The Ember Deeps: a shape in the falling ash that holds together a little
// longer than it should. It hangs back and burns.
export default defineMonster({
  id: "ash-wraith",
  name: "Ash Wraith",
  icon: { sheet: "ember-deeps", cell: 1 },
  power: 13,
  stats: { STR: 5, DEX: 14, END: 11, PER: 14, INT: 17, WIL: 17, CHA: 3 },
  overrides: { maxHp: 60 },
  weapon: { name: "cinder touch", damageType: "fire", attack: 8, ranged: true },
  row: "back",
  tags: ["spirit", "ember-touched"],
  ai: "caster",
  research: {
    tricks: "Throws fire and blinds with ash; blades pass half through it. Holy light scatters it.",
  },
  abilities: { firebolt: 1, "choking-ash": 1 },
  loot: "wraith-loot",
  passives: [
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -30 },
  ],
});
