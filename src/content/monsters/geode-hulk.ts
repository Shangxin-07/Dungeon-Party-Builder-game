import { defineMonster } from "../types";

// The Glimmering: a boulder that crystal grew inside until it stood up. Hollow
// and glittering where it's cracked; the crystal knits it back.
export default defineMonster({
  id: "geode-hulk",
  name: "Geode Hulk",
  power: 22,
  stats: { STR: 21, DEX: 6, END: 22, PER: 8, INT: 3, WIL: 14, CHA: 1 },
  overrides: { maxHp: 140 },
  weapon: { name: "boulder fists", damageType: "crushing", attack: 14 },
  row: "front",
  tags: ["construct", "crystal-grown"],
  ai: "brute",
  research: {
    tricks:
      "Slow and very hard to cut, and the crystal inside knits it once it's badly hurt. Crush it.",
  },
  abilities: { crush: 1 },
  loot: "geode-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 30,
      ifAlive: true,
      once: true,
      message: "Crystal grows across {self}'s cracks, and its wounds start to knit!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 3 }],
    },
  ],
});
