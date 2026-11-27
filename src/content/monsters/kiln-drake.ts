import { defineMonster } from "../types";

// The Kiln: a long, low lizard with scales like fired tiles, born in the heat.
// When it breathes out, the whole room feels it.
export default defineMonster({
  id: "kiln-drake",
  name: "Kiln Drake",
  icon: { sheet: "kiln", cell: 2 },
  power: 32,
  stats: { STR: 22, DEX: 12, END: 22, PER: 12, INT: 4, WIL: 14, CHA: 2 },
  overrides: { maxHp: 220 },
  weapon: { name: "burning jaws", damageType: "fire", attack: 16 },
  row: "front",
  tags: ["beast", "ember-touched"],
  ai: "brute",
  research: {
    tricks:
      "Breathes heat over the whole party and sweeps the front line with its tail. Fire barely hurts it; cold slows it.",
  },
  abilities: { "heat-blast": 1, "tail-sweep": 1 },
  loot: "drake-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "fire", percent: 60 },
    { type: "resist", damageType: "cold", percent: -25 },
  ],
});
