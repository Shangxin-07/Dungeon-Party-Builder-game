import { defineMonster } from "../types";

// The guardian of the Hearthstone's core (M8.22, DESIGN.md §20): the last
// thing the broken heart made, and the strongest thing in the pit. It only
// ever stands beside the heart, and the heart keeps pouring life into it:
// hurt it badly and its wounds close. Finish it fast.
export default defineMonster({
  id: "hearthborn",
  name: "The Hearthborn",
  icon: { sheet: "monsters-4", cell: 5 },
  power: 80,
  stats: { STR: 22, DEX: 12, END: 22, PER: 14, INT: 10, WIL: 20, CHA: 6 },
  overrides: { maxHp: 1100 },
  weapon: { name: "stone-grown fists", damageType: "crushing", attack: 28 },
  row: "front",
  tags: ["giant", "guardian"],
  ai: "brute",
  abilities: { crush: 1, "war-cry": 1, "tail-sweep": 1 },
  research: {
    tricks:
      "The heart heals it whenever it's badly hurt: hit it hard and fast. It sweeps the whole front row.",
  },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "resist", damageType: "crushing", percent: 30 },
    { type: "resist", damageType: "fire", percent: 25 },
    { type: "resist", damageType: "cold", percent: 25 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 60,
      ifAlive: true,
      message: "The heart's light runs into {self}, and its wounds start to close!",
      effects: [{ type: "applyStatus", status: "heart-fed", turns: 3 }],
    },
  ],
});
