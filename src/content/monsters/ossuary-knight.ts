import { defineMonster } from "../types";

// Floor 3's shard-bearer (DESIGN.md §20): the shard drew the bones of the Halls
// to it, and they made themselves a knight to carry it.
export default defineMonster({
  id: "ossuary-knight",
  name: "The Ossuary Knight",
  icon: { sheet: "monsters-4", cell: 2 },
  power: 44,
  stats: { STR: 16, DEX: 10, END: 16, PER: 10, INT: 6, WIL: 15, CHA: 8 },
  overrides: { maxHp: 600 },
  weapon: { name: "bone greatsword", damageType: "slashing", attack: 23 },
  row: "front",
  tags: ["undead", "shard-bearer"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: {
    tricks:
      "Armoured in other men's bones: blades and arrows skate off. Crush it, or bring holy light.",
  },
  loot: "skeleton-loot",
  abilities: { "war-cry": 1, "power-strike": 1, cleave: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "resist", damageType: "piercing", percent: 50 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
