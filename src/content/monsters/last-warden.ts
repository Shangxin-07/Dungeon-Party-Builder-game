import { defineMonster } from "../types";

// One of floor 5's shard-bearers (M8.37, DESIGN.md §21): the greatest of the
// stair wardens, still holding a shard of the Coalstone as if waiting for
// someone to come and take it back where it belongs.
export default defineMonster({
  id: "last-warden",
  name: "The Last Warden",
  power: 74,
  stats: { STR: 22, DEX: 7, END: 22, PER: 12, INT: 6, WIL: 20, CHA: 2 },
  overrides: { maxHp: 900 },
  weapon: { name: "fists of dressed stone", damageType: "crushing", attack: 36 },
  row: "front",
  tags: ["construct", "keeper-work", "shard-bearer"],
  // It was made to keep the stones from those who'd use them.
  hunts: ["align:evil"],
  ai: "brute",
  research: {
    tricks:
      "Blades and arrows skid off its stone, and it goes for whoever would use the stones. Crush it, or put its ward out with cold.",
  },
  loot: "warden-loot",
  abilities: { crush: 1, "power-strike": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -20 },
    { type: "resist", damageType: "cold", percent: -25 },
    { type: "resist", damageType: "fire", percent: 25 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
});
