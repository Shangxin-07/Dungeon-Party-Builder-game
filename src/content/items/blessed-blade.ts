import { defineItem } from "../types";

// A sword blessed at an old miners' shrine (DESIGN.md §7): it bites the dead.
export default defineItem({
  id: "blessed-blade",
  name: "Blessed Blade",
  slot: "weapon",
  value: 80,
  tags: ["sword", "blade", "melee", "holy"],
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
    { type: "bonusVsTag", tag: "undead", percent: 30 },
  ],
});
