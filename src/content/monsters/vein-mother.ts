import { defineMonster } from "../types";

// One of floor 5's shard-bearers (M8.37, DESIGN.md §21): a crystal crawler that
// found a shard of the Coalstone and grew round it, and never stopped growing.
export default defineMonster({
  id: "vein-mother",
  name: "The Vein Mother",
  icon: { sheet: "keepers-2", cell: 0 },
  power: 70,
  stats: { STR: 20, DEX: 9, END: 21, PER: 10, INT: 3, WIL: 14, CHA: 2 },
  overrides: { maxHp: 800 },
  weapon: { name: "crystal mandibles", damageType: "slashing", attack: 34 },
  row: "front",
  tags: ["beast", "heart-touched", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Crystal turns blades and arrows, and mends her when she's badly hurt; her clutch comes when she calls. Crush her, fast.",
  },
  loot: "crawler-loot",
  abilities: { "rust-bite": 1, crush: 1, "call-the-clutch": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "slashing", percent: 20 },
    { type: "resist", damageType: "piercing", percent: 20 },
    { type: "resist", damageType: "crushing", percent: -30 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 25,
      ifAlive: true,
      once: true,
      message: "The shard in {self}'s back flares, and her wounds start to knit!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 6 }],
    },
  ],
});
