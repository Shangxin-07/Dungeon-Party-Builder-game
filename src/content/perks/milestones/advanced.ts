import { definePerk } from "../../types";

// Milestone perks for the advanced and combo classes (DESIGN.md §9).
export default [
  definePerk({
    id: "runed-steel",
    name: "Runed Steel",
    description: "Spellblade 5: +3 attack, +3 spell power.",
    classes: ["spellblade"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 3 },
      { type: "modifyStat", stat: "spellPower", amount: 3 },
    ],
  }),
  definePerk({
    id: "oathkeeper",
    name: "Oathkeeper",
    description: "Paladin 5: +3 armour, +30% damage against the undead.",
    classes: ["paladin"],
    passives: [
      { type: "modifyStat", stat: "armor", amount: 3 },
      { type: "bonusVsTag", tag: "undead", percent: 30 },
    ],
  }),
  definePerk({
    id: "winters-heart",
    name: "Winter's Heart",
    description: "Frost Mage 5: +4 spell power; takes 50% less cold damage.",
    classes: ["frost-mage"],
    passives: [
      { type: "modifyStat", stat: "spellPower", amount: 4 },
      { type: "resist", damageType: "cold", percent: 50 },
    ],
  }),
  definePerk({
    id: "killers-eye",
    name: "Killer's Eye",
    description: "Assassin 5: +4 attack, +3 accuracy.",
    classes: ["assassin"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 4 },
      { type: "modifyStat", stat: "accuracy", amount: 3 },
    ],
  }),
];
