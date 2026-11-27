import { defineMonster } from "../types";

// One of floor 9's shard-bearers (M8.41, DESIGN.md §21): a hundred ash
// wraiths that drifted together round a shard of the Emberstone and never
// came apart. It sings, a low dry hiss, and the fire answers.
export default defineMonster({
  id: "ash-choir",
  name: "The Ash Choir",
  power: 100,
  stats: { STR: 6, DEX: 16, END: 20, PER: 18, INT: 24, WIL: 24, CHA: 6 },
  overrides: { maxHp: 1000 },
  weapon: { name: "cinder breath", damageType: "fire", attack: 30, ranged: true },
  row: "back",
  tags: ["spirit", "ember-touched", "shard-bearer"],
  ai: "caster",
  research: {
    tricks:
      "Stands at the back throwing fire and ash, and mends whatever fights for it. Blades half pass through it; holy light scatters it.",
  },
  loot: "wraith-loot",
  abilities: { "flame-wave": 1, "choking-ash": 1, mend: 1, "glass-storm": 1 },
  passives: [
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -25 },
  ],
});
