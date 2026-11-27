import { defineMonster } from "../types";

// The Kiln: a flame that has come loose from the stone and dances on its own,
// throwing fire at anything that isn't burning yet.
export default defineMonster({
  id: "flame-dancer",
  name: "Flame Dancer",
  icon: { sheet: "kiln", cell: 1 },
  power: 18,
  stats: { STR: 5, DEX: 18, END: 12, PER: 15, INT: 15, WIL: 15, CHA: 5 },
  overrides: { maxHp: 85 },
  weapon: { name: "lick of flame", damageType: "fire", attack: 8, ranged: true },
  row: "back",
  tags: ["spirit", "ember-touched"],
  ai: "caster",
  research: {
    tricks: "Throws fire, alone or in a wave. Blades pass half through it; cold puts it out.",
  },
  abilities: { firebolt: 1, "flame-wave": 1 },
  loot: "dancer-loot",
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 3 },
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
