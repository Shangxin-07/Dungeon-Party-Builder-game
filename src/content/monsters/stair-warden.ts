import { defineMonster } from "../types";

// The Keepers' Stair: a warden of cut stone, still walking the stair it was set to keep.
export default defineMonster({
  id: "stair-warden",
  name: "Stair Warden",
  power: 14,
  stats: { STR: 18, DEX: 7, END: 18, PER: 10, INT: 4, WIL: 16, CHA: 1 },
  overrides: { maxHp: 95 },
  weapon: { name: "stone fists", damageType: "crushing", attack: 10 },
  row: "front",
  tags: ["construct", "keeper-work"],
  ai: "brute",
  research: {
    tricks:
      "Cut stone with a ward in it: blades and arrows skid off. Crush it, or put the ward out with cold.",
  },
  abilities: { crush: 1 },
  loot: "warden-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "crushing", percent: -20 },
    { type: "resist", damageType: "cold", percent: -20 },
    { type: "resist", damageType: "fire", percent: 50 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
});
