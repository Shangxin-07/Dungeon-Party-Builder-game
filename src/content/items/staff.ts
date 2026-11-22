import { defineItem } from "../types";

export default defineItem({
  id: "staff",
  name: "Staff",
  slot: "weapon",
  value: 20,
  tags: ["staff", "melee", "focus"],
  salvage: { timber: 2 },
  damageType: "crushing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 2 },
    { type: "modifyStat", stat: "spellPower", amount: 3 },
  ],
});
