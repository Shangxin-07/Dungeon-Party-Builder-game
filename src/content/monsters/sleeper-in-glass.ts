import { defineMonster } from "../types";

// One of floor 8's shard-bearers (M8.40, DESIGN.md §21): one of the Keepers
// the crystal kept, who stood back up. It holds a shard of the Emberstone in
// its lap where the lamp should be, and it will not give it up.
export default defineMonster({
  id: "sleeper-in-glass",
  name: "The Sleeper in Glass",
  icon: { sheet: "ember-deeps", cell: 4 },
  power: 88,
  stats: { STR: 12, DEX: 10, END: 20, PER: 16, INT: 22, WIL: 24, CHA: 8 },
  overrides: { maxHp: 1000 },
  weapon: { name: "glass hands", damageType: "cold", attack: 30, ranged: true },
  row: "back",
  tags: ["undead", "keeper-work", "crystal-grown", "shard-bearer"],
  ai: "caster",
  research: {
    tricks:
      "Stands at the back, dazzling, freezing and showering the whole party with glass, and mends whatever fights for it. Cold won't touch it, and the crystal knits it once. Crush the glass; holy light still knows it.",
  },
  loot: "grown-keeper",
  abilities: { refraction: 1, blizzard: 1, "glass-storm": 1, mend: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -20 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: 50 },
    { type: "resist", damageType: "holy", percent: -20 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 40,
      ifAlive: true,
      once: true,
      message: "Crystal grows back over {self}'s cracks, and it settles, mending.",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 5 }],
    },
  ],
});
