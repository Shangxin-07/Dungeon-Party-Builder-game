import { defineMonster } from "../types";

// Variant: still giving orders long after death. Leads patrols in the Bone Halls.
export default defineMonster({
  id: "skeleton-captain",
  name: "Skeleton Captain",
  power: 9,
  stats: { STR: 13, DEX: 9, END: 12, PER: 9, INT: 5, WIL: 12, CHA: 6 },
  overrides: { maxHp: 44 },
  weapon: { name: "rusted greatsword", damageType: "slashing", attack: 6 },
  row: "front",
  tags: ["undead"],
  ai: "brute",
  loot: "skeleton-loot",
  variant: { of: "skeleton", chance: 0.15, minLevel: 2.5 },
  abilities: { "war-cry": 1, "power-strike": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "piercing", percent: 50 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
