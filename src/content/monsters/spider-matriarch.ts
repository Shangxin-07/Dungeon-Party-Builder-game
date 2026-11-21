import { defineMonster } from "../types";

// Variant: sometimes heads a spider nest from the Warrens down.
export default defineMonster({
  id: "spider-matriarch",
  name: "Spider Matriarch",
  power: 8,
  stats: { STR: 11, DEX: 14, END: 10, PER: 13, INT: 4, WIL: 9, CHA: 1 },
  overrides: { maxHp: 40 },
  weapon: { name: "fangs", damageType: "piercing", attack: 5 },
  row: "front",
  tags: ["beast", "ambusher"],
  ai: "brute",
  loot: "spider-loot",
  variant: { of: "cave-spider", chance: 0.15, minLevel: 2 },
  abilities: { "venom-bite": 1, web: 1, "call-the-brood": 1 },
  passives: [{ type: "resist", damageType: "poison", percent: 100 }],
});
