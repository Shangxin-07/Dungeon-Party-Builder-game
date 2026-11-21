import { defineMonster } from "../types";

// Ambusher: gets a vicious first strike unless a scout spots it.
export default defineMonster({
  id: "cave-spider",
  name: "Cave Spider",
  power: 4,
  stats: { STR: 8, DEX: 14, END: 7, PER: 12, INT: 2, WIL: 6, CHA: 1 },
  overrides: { maxHp: 22 },
  weapon: { name: "fangs", damageType: "piercing", attack: 4 },
  row: "front",
  tags: ["beast", "ambusher"],
  ai: "brute",
  loot: "spider-loot",
  abilities: { "venom-bite": 1, web: 3 },
  passives: [{ type: "resist", damageType: "poison", percent: 100 }],
});
