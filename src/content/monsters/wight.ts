import { defineMonster } from "../types";

// The Bone Halls: something worse than bones, that keeps the ossuaries. Its touch drains the living.
export default defineMonster({
  id: "wight",
  name: "Wight",
  icon: { sheet: "monsters-3", cell: 5 },
  power: 6,
  stats: { STR: 11, DEX: 10, END: 11, PER: 11, INT: 9, WIL: 14, CHA: 4 },
  overrides: { maxHp: 36 },
  weapon: { name: "grave-cold hands", damageType: "cold", attack: 5 },
  row: "front",
  tags: ["undead", "spirit"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: {
    tricks: "Its touch drains the strength from you. Fire and holy light hurt it badly.",
  },
  abilities: { "wight-touch": 1 },
  loot: "wight-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "resist", damageType: "slashing", percent: 20 },
    { type: "resist", damageType: "cold", percent: 50 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "fire", percent: -25 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
