import { defineMonster } from "../types";

// The Old Delve: a slab of the deep-silver vein the heart stood up and set walking. Slow, and very hard.
export default defineMonster({
  id: "ore-golem",
  name: "Ore Golem",
  power: 12,
  stats: { STR: 18, DEX: 6, END: 18, PER: 6, INT: 1, WIL: 14, CHA: 1 },
  overrides: { maxHp: 90 },
  weapon: { name: "stone fists", damageType: "crushing", attack: 9 },
  row: "front",
  tags: ["giant", "heart-touched"],
  ai: "brute",
  research: {
    tricks:
      "Slow, and blades and arrows barely mark it. Picks and maces break it; so does cold, in its veins.",
  },
  abilities: { crush: 1 },
  loot: "golem-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: -4 },
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "crushing", percent: -20 },
    { type: "resist", damageType: "cold", percent: -20 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
});
