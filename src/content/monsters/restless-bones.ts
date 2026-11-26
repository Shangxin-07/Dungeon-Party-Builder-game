import { defineMonster } from "../types";

// The Bone Halls: the town's own dead, stood up by the broken stone. Knock them
// down and they pull themselves back together, unless something breaks the bones
// (crushing), burns them, or lays them to rest (holy).
export default defineMonster({
  id: "restless-bones",
  name: "Restless Bones",
  icon: { sheet: "monsters-3", cell: 4 },
  power: 4,
  stats: { STR: 10, DEX: 8, END: 9, PER: 8, INT: 3, WIL: 10, CHA: 1 },
  overrides: { maxHp: 24 },
  weapon: { name: "grave-spade", damageType: "slashing", attack: 4 },
  row: "front",
  tags: ["undead"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: {
    tricks: "Gets back up once unless the killing blow breaks, burns or blesses it. Bring a mace.",
  },
  loot: "skeleton-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "resist", damageType: "piercing", percent: 50 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
  triggers: [
    {
      on: "slain",
      once: true,
      unless: ["crushing", "fire", "holy"],
      message: "{self}'s bones drag themselves back together!",
      effects: [{ type: "heal", amount: 12 }],
    },
  ],
});
