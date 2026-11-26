import { defineMonster } from "../types";

// Floor 2's shard-bearer (DESIGN.md §20): a spider swollen round a shard that
// glows through her belly. Every brood in the Warrens is hers.
export default defineMonster({
  id: "brood-queen",
  name: "The Brood Queen",
  icon: { sheet: "monsters-4", cell: 1 },
  power: 36,
  stats: { STR: 14, DEX: 15, END: 14, PER: 14, INT: 5, WIL: 11, CHA: 1 },
  overrides: { maxHp: 500 },
  weapon: { name: "glowing fangs", damageType: "piercing", attack: 21 },
  row: "front",
  tags: ["beast", "ambusher", "shard-bearer"],
  ai: "brute",
  research: { tricks: "Her brood keeps coming while she lives. Burn the webs and go for her." },
  loot: "spider-loot",
  abilities: { "venom-bite": 1, web: 1, "call-the-brood": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "fire", percent: -25 },
  ],
});
