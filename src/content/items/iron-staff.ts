import { defineItem } from "../types";

export default defineItem({
  id: "iron-staff",
  name: "Iron-shod Staff",
  slot: "weapon",
  value: 70,
  tags: ["staff", "melee", "focus"],
  salvage: { timber: 1, "iron-ore": 1 },
  damageType: "crushing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 3 },
    { type: "modifyStat", stat: "spellPower", amount: 6 },
  ],
});
