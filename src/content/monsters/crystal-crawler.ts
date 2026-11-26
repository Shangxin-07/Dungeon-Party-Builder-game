import { defineMonster } from "../types";

// The Old Delve: a cave beetle the heart got into. Crystal grows through its shell, and the
// crystal mends it: hurt it badly and its wounds start to knit.
export default defineMonster({
  id: "crystal-crawler",
  name: "Crystal Crawler",
  icon: { sheet: "monsters-3", cell: 9 },
  power: 8,
  stats: { STR: 13, DEX: 9, END: 14, PER: 9, INT: 2, WIL: 10, CHA: 1 },
  overrides: { maxHp: 46 },
  weapon: { name: "crystal mandibles", damageType: "slashing", attack: 7 },
  row: "front",
  tags: ["beast", "heart-touched"],
  ai: "brute",
  research: {
    tricks:
      "Crystal in its shell turns blades and arrows, and mends it when it's badly hurt. Crush it, fast.",
  },
  abilities: { "rust-bite": 1 },
  loot: "crawler-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 15,
      ifAlive: true,
      once: true,
      message: "The crystal in {self}'s shell flares, and its wounds start to knit!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 3 }],
    },
  ],
});
