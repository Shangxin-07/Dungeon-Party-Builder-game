import { defineItem } from "../types";

// The miners kept a few to keep goblins off the stores. Hits hard, no skill needed.
export default defineItem({
  id: "crossbow",
  name: "Crossbow",
  slot: "weapon",
  value: 45,
  tags: ["crossbow", "ranged"],
  salvage: { timber: 1, "iron-ore": 1 },
  damageType: "piercing",
  ranged: true,
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "modifyStat", stat: "initiative", amount: -2 },
  ],
});
