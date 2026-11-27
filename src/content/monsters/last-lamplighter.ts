import { defineMonster } from "../types";

// One of floor 7's shard-bearers (M8.39, DESIGN.md §21): the lamplighter who
// went first, carrying a shard of the Emberstone in its lamp for a light. It
// still walks the round, and the others keep it on its feet.
export default defineMonster({
  id: "last-lamplighter",
  name: "The Last Lamplighter",
  power: 86,
  stats: { STR: 12, DEX: 14, END: 18, PER: 18, INT: 22, WIL: 22, CHA: 6 },
  overrides: { maxHp: 700 },
  weapon: { name: "lamp hook", damageType: "piercing", attack: 20 },
  row: "back",
  tags: ["undead", "keeper-work", "shard-bearer"],
  ai: "caster",
  research: {
    tricks:
      "Stands at the back throwing fire and mending its crew. Fire barely touches it; holy light does.",
  },
  loot: "lamplighter-loot",
  abilities: { firebolt: 1, "flame-wave": 1, mend: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -30 },
  ],
});
