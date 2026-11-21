import { defineMonster } from "../types";

// Called by a Spider Matriarch. Small, quick, venomous.
export default defineMonster({
  id: "spiderling",
  name: "Spiderling",
  power: 1,
  stats: { STR: 4, DEX: 13, END: 4, PER: 10, INT: 1, WIL: 3, CHA: 1 },
  overrides: { maxHp: 8 },
  weapon: { name: "fangs", damageType: "piercing", attack: 2 },
  row: "front",
  tags: ["beast"],
  ai: "brute",
  abilities: { "venom-bite": 1 },
  passives: [{ type: "resist", damageType: "poison", percent: 100 }],
  summonOnly: true,
});
