import { defineMonster } from "../types";

// The Glimmering: a long, low hunter with crystal growing through its hide. In
// the thrown light you see it in ten places before it's on you.
export default defineMonster({
  id: "glimmer-stalker",
  name: "Glimmer Stalker",
  icon: { sheet: "glimmering", cell: 0 },
  power: 14,
  stats: { STR: 15, DEX: 18, END: 13, PER: 16, INT: 4, WIL: 10, CHA: 1 },
  overrides: { maxHp: 85 },
  weapon: { name: "glass claws", damageType: "piercing", attack: 12 },
  row: "front",
  tags: ["beast", "ambusher", "crystal-grown"],
  ai: "brute",
  research: {
    tricks:
      "Quick and hard to pin down, and its claws hamstring. Crystal turns blades; crushing blows crack it.",
  },
  abilities: { hamstring: 1 },
  loot: "glimmer-loot",
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: 3 },
    { type: "resist", damageType: "slashing", percent: 20 },
    { type: "resist", damageType: "piercing", percent: 20 },
    { type: "resist", damageType: "crushing", percent: -25 },
  ],
});
