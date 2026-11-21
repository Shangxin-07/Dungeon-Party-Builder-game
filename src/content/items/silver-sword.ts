import { defineItem } from "../types";

// Deep silver over iron. Bites the dead like nothing else with an edge.
export default defineItem({
  id: "silver-sword",
  name: "Silver Sword",
  slot: "weapon",
  value: 150,
  tags: ["sword", "blade", "melee", "silver"],
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 7 },
    { type: "modifyStat", stat: "accuracy", amount: 3 },
    { type: "bonusVsTag", tag: "undead", percent: 50 },
  ],
});
