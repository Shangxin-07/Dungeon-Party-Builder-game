import { defineItem } from "../types";

export default defineItem({
  id: "longbow",
  name: "Longbow",
  slot: "weapon",
  value: 65,
  tags: ["bow", "ranged"],
  damageType: "piercing",
  ranged: true,
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "modifyStat", stat: "accuracy", amount: 3 },
  ],
});
