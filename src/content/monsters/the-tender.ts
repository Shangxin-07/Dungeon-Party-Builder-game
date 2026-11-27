import { defineMonster } from "../types";

// The Emberstone's guardian (M8.41, DESIGN.md §21): the shape that stands in
// the Kiln's fire, holding the stone's broken halves together with both
// hands. Whatever it was once, it has tended the stone so long it's made of it.
export default defineMonster({
  id: "the-tender",
  name: "The Tender",
  icon: { sheet: "kiln", cell: 6 },
  power: 150,
  stats: { STR: 24, DEX: 10, END: 28, PER: 18, INT: 24, WIL: 28, CHA: 8 },
  overrides: { maxHp: 1800 },
  weapon: { name: "white-hot hands", damageType: "fire", attack: 34 },
  row: "front",
  tags: ["spirit", "keeper-work", "ember-touched", "guardian"],
  ai: "brute",
  research: {
    tricks:
      "The Emberstone's own fire in a tending shape: it burns the whole party in waves and the stone feeds it when it's badly hurt. Fire is nothing to it; cold and holy light hurt it.",
  },
  loot: "kiln-store",
  abilities: { "heat-blast": 1, "flame-wave": 1, crush: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 5 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
    { type: "resist", damageType: "holy", percent: -15 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 60,
      ifAlive: true,
      once: true,
      message: "The Emberstone flares white behind {self}, and the fire pours back into it!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 5 }],
    },
  ],
});
