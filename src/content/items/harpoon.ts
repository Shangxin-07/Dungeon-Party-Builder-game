import { defineItem } from "../types";

// The Flooded Shafts: someone came down here to hunt the eels. Thrown, and hauled back on its line.
export default defineItem({
  id: "harpoon",
  name: "Harpoon",
  slot: "weapon",
  value: 70,
  tags: ["spear", "ranged"],
  salvage: { "iron-ore": 1, timber: 1 },
  damageType: "piercing",
  ranged: true,
  passives: [
    { type: "modifyStat", stat: "attack", amount: 6 },
    { type: "bonusVsTag", tag: "beast", percent: 25 },
  ],
});
