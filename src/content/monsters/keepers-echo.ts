import { defineMonster } from "../types";

// The Keepers' Stair: something left of whoever kept the stones. It still tends the
// wards, and doesn't know the party from the things it kept out.
export default defineMonster({
  id: "keepers-echo",
  name: "Keeper's Echo",
  power: 9,
  stats: { STR: 7, DEX: 12, END: 10, PER: 14, INT: 15, WIL: 16, CHA: 6 },
  overrides: { maxHp: 40 },
  weapon: { name: "cold light", damageType: "cold", attack: 6, ranged: true },
  row: "back",
  tags: ["spirit", "keeper-work"],
  ai: "caster",
  research: {
    tricks:
      "Hardly there at all: blades pass through it. Holy light unsettles it, and it keeps its wardens mended.",
  },
  abilities: { "grave-chill": 1, mend: 1 },
  loot: "echo-loot",
  passives: [
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "piercing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "cold", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -40 },
  ],
});
