import { defineItem } from "../types";

// Hits hard and shatters bone: the answer to skeletons.
export default defineItem({
  id: "axe",
  name: "Axe",
  slot: "weapon",
  value: 30,
  tags: ["axe", "heavy", "melee"],
  damageType: "slashing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "bonusVsTag", tag: "undead", percent: 50 },
  ],
});
