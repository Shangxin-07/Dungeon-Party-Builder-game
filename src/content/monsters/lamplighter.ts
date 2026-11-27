import { defineMonster } from "../types";

// The Coal Halls: a husk in a long coat that still walks the halls lighting the
// lamps, and keeps the stokers on their feet.
export default defineMonster({
  id: "lamplighter",
  name: "Lamplighter",
  power: 11,
  stats: { STR: 8, DEX: 11, END: 11, PER: 13, INT: 16, WIL: 17, CHA: 5 },
  overrides: { maxHp: 55 },
  weapon: { name: "lamp hook", damageType: "piercing", attack: 6 },
  row: "back",
  tags: ["undead", "keeper-work"],
  ai: "caster",
  research: {
    tricks: "Throws fire from the back and mends whatever's in front of it. Reach it first.",
  },
  abilities: { firebolt: 1, mend: 1 },
  loot: "lamplighter-loot",
  passives: [
    { type: "resist", damageType: "fire", percent: 50 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -30 },
  ],
});
