import { defineItem } from "../types";

export default defineItem({
  id: "short-bow",
  name: "Short Bow",
  slot: "weapon",
  value: 25,
  tags: ["bow", "ranged"],
  damageType: "piercing",
  ranged: true,
  abilities: ["aimed-shot"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 3 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
  ],
});
