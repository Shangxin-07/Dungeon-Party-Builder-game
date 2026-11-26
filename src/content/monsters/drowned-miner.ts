import { defineMonster } from "../types";

// The Flooded Shafts: the miners who were working the shafts when the water came in. They're still working.
export default defineMonster({
  id: "drowned-miner",
  name: "Drowned Miner",
  icon: { sheet: "monsters-3", cell: 6 },
  power: 7,
  stats: { STR: 13, DEX: 8, END: 13, PER: 8, INT: 4, WIL: 11, CHA: 1 },
  overrides: { maxHp: 42 },
  weapon: { name: "rusted pick", damageType: "piercing", attack: 6 },
  row: "front",
  tags: ["undead"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: { tricks: "Grabs and drags you under the water. Slow; holy light hurts it badly." },
  abilities: { "drag-under": 1 },
  loot: "drowned-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "cold", percent: 50 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
