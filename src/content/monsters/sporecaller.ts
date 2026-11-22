import { defineMonster } from "../types";

// A walking mushroom the size of a man. Stays back and fills the air with spores.
export default defineMonster({
  id: "sporecaller",
  name: "Sporecaller",
  power: 5,
  stats: { STR: 8, DEX: 6, END: 10, PER: 8, INT: 12, WIL: 12, CHA: 1 },
  overrides: { maxHp: 26 },
  weapon: { name: "lashing tendrils", damageType: "crushing", attack: 3, ranged: true },
  row: "back",
  tags: ["plant", "cunning"],
  ai: "caster",
  abilities: { "spore-burst": 1 },
  loot: "spore-loot",
  passives: [
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "fire", percent: -50 },
  ],
});
