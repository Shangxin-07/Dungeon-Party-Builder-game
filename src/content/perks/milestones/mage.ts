import { definePerk } from "../../types";

// Mage milestone perks (DESIGN.md §9): offered only on reaching these Mage
// levels (classes/mage.ts `milestones`), never at random.
export default [
  definePerk({
    id: "arcane-reserves",
    name: "Arcane Reserves",
    description: "Mage 5: +20 mana.",
    classes: ["mage"],
    passives: [{ type: "modifyStat", stat: "mana", amount: 20 }],
  }),
  definePerk({
    id: "kindled",
    name: "Kindled",
    description: "Mage 5: +3 spell power.",
    classes: ["mage"],
    passives: [{ type: "modifyStat", stat: "spellPower", amount: 3 }],
  }),
  definePerk({
    id: "elementalist",
    name: "Elementalist",
    description: "Mage 10: +4 spell power; takes 25% less fire and cold damage.",
    classes: ["mage"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 4 },
      { type: "resist", damageType: "fire", percent: 25 },
      { type: "resist", damageType: "cold", percent: 25 },
    ],
  }),
  definePerk({
    id: "wellspring",
    name: "Wellspring",
    description: "Mage 10: +30 mana, +2 resist.",
    classes: ["mage"],
    passives: [
      { type: "modifyStat", stat: "mana", amount: 30 },
      { type: "modifyStat", stat: "resist", amount: 2 },
    ],
  }),
  definePerk({
    id: "archmages-focus",
    name: "Archmage's Focus",
    description: "Mage 20: +6 spell power.",
    classes: ["mage"],
    passives: [{ type: "modifyStat", stat: "spellPower", amount: 6 }],
  }),
  definePerk({
    id: "mana-font",
    name: "Mana Font",
    description: "Mage 30: +50 mana.",
    classes: ["mage"],
    passives: [{ type: "modifyStat", stat: "mana", amount: 50 }],
  }),
  definePerk({
    id: "spell-lord",
    name: "Spell Lord",
    description: "Mage 40: +8 spell power, +20 mana.",
    classes: ["mage"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 8 },
      { type: "modifyStat", stat: "mana", amount: 20 },
    ],
  }),
  definePerk({
    id: "archmage",
    name: "Archmage",
    description: "Mage 50: +15 spell power, +60 mana.",
    classes: ["mage"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 15 },
      { type: "modifyStat", stat: "mana", amount: 60 },
    ],
  }),
];
