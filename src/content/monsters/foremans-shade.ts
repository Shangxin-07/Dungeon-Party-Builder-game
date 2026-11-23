import { defineMonster } from "../types";

// Variant: the foreman who kept the shift digging. Still rings the bell, and the crew still comes.
// Nothing can hurt it until the Library has Studied it (M7.07): the first party to meet it runs.
export default defineMonster({
  id: "foremans-shade",
  name: "The Foreman's Shade",
  icon: { sheet: "monsters-2", cell: 4 },
  power: 13,
  stats: { STR: 13, DEX: 10, END: 13, PER: 12, INT: 10, WIL: 15, CHA: 8 },
  overrides: { maxHp: 54 },
  weapon: { name: "ghostly pick", damageType: "cold", attack: 7 },
  row: "front",
  tags: ["undead", "spirit", "cunning"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  loot: "delver-loot",
  variant: { of: "lost-delver", chance: 0.2, minLevel: 5 },
  abilities: { "war-cry": 1, "call-the-crew": 1 },
  // M7.07: nothing touches it until the guild knows what keeps it down there.
  ward: { name: "bound to the last shift", tier: 2 },
  research: {
    tricks:
      "It's held by the shift it never finished: name the dead crew to it and blows land. It calls the crew back to the bell.",
  },
  passives: [
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "piercing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "cold", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
