import { defineItem } from "../types";

export default defineItem({
  id: "short-bow",
  name: "Short Bow",
  icon: { sheet: "weapons", cell: 13 },
  slot: "weapon",
  value: 25,
  tags: ["bow", "ranged"],
  salvage: { timber: 1 },
  damageType: "piercing",
  ranged: true,
  abilities: ["aimed-shot"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 3 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
  ],
});
