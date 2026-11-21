import { definePerk } from "../../types";

// Scout milestone perks (DESIGN.md §9): offered only on reaching these Scout
// levels (classes/scout.ts `milestones`), never at random.
export default [
  definePerk({
    id: "eagle-eye",
    name: "Eagle Eye",
    description: "Scout 5: +3 accuracy, +10 scouting.",
    classes: ["scout"],
    passives: [
      { type: "modifyStat", stat: "accuracy", amount: 3 },
      { type: "modifySkill", skill: "scouting", amount: 10 },
    ],
  }),
  definePerk({
    id: "shadow-step",
    name: "Shadow Step",
    description: "Scout 5: +3 evasion.",
    classes: ["scout"],
    passives: [{ type: "modifyStat", stat: "evasion", amount: 3 }],
  }),
  definePerk({
    id: "deadeye",
    name: "Deadeye",
    description: "Scout 10: +4 attack.",
    classes: ["scout"],
    passives: [{ type: "modifyStat", stat: "attack", amount: 4 }],
  }),
  definePerk({
    id: "pathfinder",
    name: "Pathfinder",
    description: "Scout 10: +20 scouting, +10 appraisal.",
    classes: ["scout"],
    passives: [
      { type: "modifySkill", skill: "scouting", amount: 20 },
      { type: "modifySkill", skill: "appraisal", amount: 10 },
    ],
  }),
  definePerk({
    id: "ghost",
    name: "Ghost",
    description: "Scout 20: +6 evasion, +4 initiative.",
    classes: ["scout"],
    passives: [
      { type: "modifyStat", stat: "evasion", amount: 6 },
      { type: "modifyStat", stat: "initiative", amount: 4 },
    ],
  }),
  definePerk({
    id: "hunters-instinct",
    name: "Hunter's Instinct",
    description: "Scout 30: +5 accuracy, +3 attack.",
    classes: ["scout"],
    passives: [
      { type: "modifyStat", stat: "accuracy", amount: 5 },
      { type: "modifyStat", stat: "attack", amount: 3 },
    ],
  }),
  definePerk({
    id: "quickdraw",
    name: "Quickdraw",
    description: "Scout 40: +8 initiative, +4 attack.",
    classes: ["scout"],
    passives: [
      { type: "modifyStat", stat: "initiative", amount: 8 },
      { type: "modifyStat", stat: "attack", amount: 4 },
    ],
  }),
  definePerk({
    id: "master-of-the-hunt",
    name: "Master of the Hunt",
    description: "Scout 50: +10 attack, +10 accuracy, +5 evasion.",
    classes: ["scout"],
    passives: [
      { type: "modifyStat", stat: "attack", amount: 10 },
      { type: "modifyStat", stat: "accuracy", amount: 10 },
      { type: "modifyStat", stat: "evasion", amount: 5 },
    ],
  }),
];
