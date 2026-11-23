import { defineMonster } from "../types";

// The miners who dug too deep, still down there. Blades pass through them; holy things don't.
export default defineMonster({
  id: "lost-delver",
  name: "Lost Delver",
  icon: { sheet: "monsters-2", cell: 3 },
  power: 8,
  stats: { STR: 8, DEX: 11, END: 9, PER: 12, INT: 12, WIL: 14, CHA: 2 },
  overrides: { maxHp: 30 },
  weapon: { name: "grave-cold touch", damageType: "cold", attack: 4, ranged: true },
  row: "back",
  tags: ["undead", "spirit"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "caster",
  research: { tricks: "Blades pass through it, cold is its own. Holy light and fire don't." },
  abilities: { "grave-chill": 1 },
  loot: "delver-loot",
  passives: [
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "piercing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "cold", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
