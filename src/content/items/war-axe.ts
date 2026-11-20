import { defineItem } from "../types";

// Like the axe, only more so.
export default defineItem({
  id: "war-axe",
  name: "War Axe",
  slot: "weapon",
  value: 75,
  tags: ["axe", "heavy", "melee"],
  damageType: "slashing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 7 },
    { type: "bonusVsTag", tag: "undead", percent: 50 },
  ],
});
