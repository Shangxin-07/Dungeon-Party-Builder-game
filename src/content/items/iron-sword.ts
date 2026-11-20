import { defineItem } from "../types";

export default defineItem({
  id: "iron-sword",
  name: "Iron Sword",
  slot: "weapon",
  value: 70,
  tags: ["sword", "blade", "melee"],
  damageType: "slashing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 6 },
    { type: "modifyStat", stat: "accuracy", amount: 3 },
  ],
});
