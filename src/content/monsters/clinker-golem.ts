import { defineMonster } from "../types";

// The Kiln: a lump of fired brick and clinker that the Keepers stacked to
// hold the kiln's walls up. It still holds them up, and it hits like a wall.
export default defineMonster({
  id: "clinker-golem",
  name: "Clinker Golem",
  power: 30,
  stats: { STR: 23, DEX: 6, END: 24, PER: 8, INT: 2, WIL: 14, CHA: 1 },
  overrides: { maxHp: 210 },
  weapon: { name: "brick fists", damageType: "crushing", attack: 17 },
  row: "front",
  tags: ["construct", "keeper-work"],
  ai: "brute",
  research: {
    tricks:
      "Slow and very hard; blades and arrows chip it. Fire hardly warms it; cold cracks fired brick.",
  },
  abilities: { crush: 1 },
  loot: "clinker-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "fire", percent: 50 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: -20 },
  ],
});
