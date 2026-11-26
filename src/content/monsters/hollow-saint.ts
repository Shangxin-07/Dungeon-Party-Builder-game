import { defineMonster } from "../types";

// One of floor 4's shard-bearers (DESIGN.md §20): a ghast that wears its shard
// like a holy relic, and leads the ghouls of the Shafts in something like prayer.
export default defineMonster({
  id: "hollow-saint",
  name: "The Hollow Saint",
  icon: { sheet: "monsters-4", cell: 4 },
  power: 52,
  stats: { STR: 16, DEX: 13, END: 16, PER: 12, INT: 9, WIL: 16, CHA: 10 },
  overrides: { maxHp: 850 },
  weapon: { name: "relic-claws", damageType: "slashing", attack: 28 },
  row: "front",
  tags: ["undead", "shard-bearer"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: { tricks: "Its pack fights harder while it stands. Holy light burns it." },
  loot: "ghoul-loot",
  abilities: { "ghoul-claw": 1, rend: 1, "war-cry": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: 25 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
