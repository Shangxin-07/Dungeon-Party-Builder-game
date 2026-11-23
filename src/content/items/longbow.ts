import { defineItem } from "../types";

export default defineItem({
  id: "longbow",
  name: "Longbow",
  icon: { sheet: "weapons", cell: 14 },
  slot: "weapon",
  value: 65,
  tags: ["bow", "ranged"],
  salvage: { timber: 2 },
  damageType: "piercing",
  ranged: true,
  abilities: ["aimed-shot"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "modifyStat", stat: "accuracy", amount: 3 },
  ],
});
