import { definePerk } from "../../types";

// Fighter milestone perks (DESIGN.md §9): offered only on reaching these
// Fighter levels (classes/fighter.ts `milestones`), never at random.
export default [
  definePerk({
    id: "weapon-master",
    name: "Weapon Master",
    description: "Fighter 5: +3 attack, +2 accuracy.",
    classes: ["fighter"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 3 },
      { type: "modifyStat", stat: "accuracy", amount: 2 },
    ],
  }),
  definePerk({
    id: "iron-hide",
    name: "Iron Hide",
    description: "Fighter 5: +3 armour.",
    classes: ["fighter"],
    passives: [{ type: "modifyStat", stat: "armor", amount: 3 }],
  }),
  definePerk({
    id: "veteran",
    name: "Veteran",
    description: "Fighter 10: +15 max HP, +2 armour.",
    classes: ["fighter"],
    passives: [
      { type: "modifyStat", stat: "maxHp", amount: 15 },
      { type: "modifyStat", stat: "armor", amount: 2 },
    ],
  }),
  definePerk({
    id: "slayer",
    name: "Slayer",
    description: "Fighter 10: +15% damage against beasts and goblinoids.",
    classes: ["fighter"],
    passives: [
      { type: "bonusVsTag", tag: "beast", percent: 15 },
      { type: "bonusVsTag", tag: "goblinoid", percent: 15 },
    ],
  }),
  definePerk({
    id: "juggernaut",
    name: "Juggernaut",
    description: "Fighter 20: +5 attack, +20 max HP.",
    classes: ["fighter"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 5 },
      { type: "modifyStat", stat: "maxHp", amount: 20 },
    ],
  }),
  definePerk({
    id: "unbreakable",
    name: "Unbreakable",
    description: "Fighter 30: takes 15% less slashing, piercing and crushing damage.",
    classes: ["fighter"],
    passives: [
      { type: "resist", damageType: "slashing", percent: 15 },
      { type: "resist", damageType: "piercing", percent: 15 },
      { type: "resist", damageType: "crushing", percent: 15 },
    ],
  }),
  definePerk({
    id: "warlord",
    name: "Warlord",
    description: "Fighter 40: +8 attack, +4 armour.",
    classes: ["fighter"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 8 },
      { type: "modifyStat", stat: "armor", amount: 4 },
    ],
  }),
  definePerk({
    id: "legend-of-the-pit",
    name: "Legend of the Pit",
    description: "Fighter 50: +15 attack, +40 max HP. Songs are sung.",
    classes: ["fighter"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 15 },
      { type: "modifyStat", stat: "maxHp", amount: 40 },
    ],
  }),
];
