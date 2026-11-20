import { defineMonster } from "../types";

// Weak, but splits when hit hard.
export default defineMonster({
  id: "slime",
  name: "Slime",
  power: 3,
  stats: { STR: 6, DEX: 4, END: 8, PER: 3, INT: 1, WIL: 4, CHA: 1 },
  overrides: { maxHp: 26 },
  weapon: { name: "pseudopod", damageType: "crushing", attack: 4 },
  row: "front",
  tags: ["ooze"],
  ai: "brute",
  passives: [{ type: "resist", damageType: "piercing", percent: 25 }],
  triggers: [
    {
      on: "damaged",
      minDamage: 8,
      ifAlive: true,
      once: true,
      message: "{self} splits in two!",
      effects: [{ type: "summon", monster: "little-slime", count: 1 }],
    },
  ],
});
