import { defineMonster } from "../types";

// The guardian of the Coalstone's heart (M8.38, DESIGN.md §21): a fire the
// Coalstone banked up into the shape of the ones who used to tend it. It
// stands where they stood, and the heart feeds it when it's badly hurt.
export default defineMonster({
  id: "banked-fire",
  name: "The Banked Fire",
  power: 100,
  stats: { STR: 22, DEX: 14, END: 22, PER: 16, INT: 14, WIL: 22, CHA: 8 },
  overrides: { maxHp: 1600 },
  weapon: { name: "coal-red hands", damageType: "fire", attack: 36 },
  row: "front",
  tags: ["elemental", "guardian"],
  ai: "brute",
  abilities: { crush: 1, "war-cry": 1, "heat-blast": 1 },
  research: {
    tricks:
      "Fire feeds it, cold hurts it, and the heart heals it whenever it's badly hurt: hit it hard, fast and cold. It sweeps the whole front row.",
  },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 70,
      ifAlive: true,
      message: "The Coalstone flares, and {self} burns up brighter!",
      effects: [{ type: "applyStatus", status: "heart-fed", turns: 3 }],
    },
  ],
});
