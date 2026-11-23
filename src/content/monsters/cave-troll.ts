import { defineMonster } from "../types";

// One big troll is a whole fight. Hurt it and its wounds start to close: finish it fast,
// or bring fire.
export default defineMonster({
  id: "cave-troll",
  name: "Cave Troll",
  icon: { sheet: "monsters-2", cell: 1 },
  power: 12,
  stats: { STR: 17, DEX: 7, END: 16, PER: 8, INT: 4, WIL: 8, CHA: 2 },
  overrides: { maxHp: 80 },
  weapon: { name: "stone club", damageType: "crushing", attack: 9 },
  row: "front",
  tags: ["giant", "beast"],
  ai: "brute",
  abilities: { crush: 4.5 },
  loot: "troll-loot",
  research: { tricks: "Its wounds close once it's hurt: finish it fast, or bring fire." },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "fire", percent: -50 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 10,
      ifAlive: true,
      once: true,
      message: "{self}'s wounds start to close!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 4 }],
    },
  ],
});
