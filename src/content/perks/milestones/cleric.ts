import { definePerk } from "../../types";

// Cleric milestone perks (DESIGN.md §9): offered only on reaching these
// Cleric levels (classes/cleric.ts `milestones`), never at random.
export default [
  definePerk({
    id: "blessed-hands",
    name: "Blessed Hands",
    description: "Cleric 5: +3 spell power, +10 medicine.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 3 },
      { type: "modifySkill", skill: "medicine", amount: 10 },
    ],
  }),
  definePerk({
    id: "shield-of-faith",
    name: "Shield of Faith",
    description: "Cleric 5: +3 armour, +2 resist.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "armor", amount: 3 },
      { type: "modifyStat", stat: "resist", amount: 2 },
    ],
  }),
  definePerk({
    id: "holy-light",
    name: "Holy Light",
    description: "Cleric 10: +25% damage against the undead.",
    classes: ["cleric"],
    passives: [{ type: "bonusVsTag", tag: "undead", percent: 25 }],
  }),
  definePerk({
    id: "sanctuary",
    name: "Sanctuary",
    description: "Cleric 10: +4 resist, +15 max HP.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "resist", amount: 4 },
      { type: "modifyStat", stat: "maxHp", amount: 15 },
    ],
  }),
  definePerk({
    id: "saintly",
    name: "Saintly",
    description: "Cleric 20: +5 spell power, +20 mana.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 5 },
      { type: "modifyStat", stat: "mana", amount: 20 },
    ],
  }),
  definePerk({
    id: "bulwark-of-faith",
    name: "Bulwark of Faith",
    description: "Cleric 30: +4 armour, +5 resist.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "armor", amount: 4 },
      { type: "modifyStat", stat: "resist", amount: 5 },
    ],
  }),
  definePerk({
    id: "radiant",
    name: "Radiant",
    description: "Cleric 40: +50% damage against the undead, +5 spell power.",
    classes: ["cleric"],
    passives: [
      { type: "bonusVsTag", tag: "undead", percent: 50 },
      { type: "modifyStat", stat: "spellPower", amount: 5 },
    ],
  }),
  definePerk({
    id: "living-saint",
    name: "Living Saint",
    description: "Cleric 50: +12 spell power, +40 max HP, +40 mana.",
    classes: ["cleric"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 12 },
      { type: "modifyStat", stat: "maxHp", amount: 40 },
      { type: "modifyStat", stat: "mana", amount: 40 },
    ],
  }),
];
