import { defineItem } from "../types";

// Hits hard and shatters bone: the answer to skeletons.
export default defineItem({
  id: "axe",
  name: "Axe",
  icon: { sheet: "weapons", cell: 7 },
  slot: "weapon",
  value: 30,
  tags: ["axe", "heavy", "melee"],
  salvage: { "iron-ore": 2, timber: 1 },
  damageType: "slashing",
  abilities: ["cleave"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "bonusVsTag", tag: "undead", percent: 50 },
  ],
});
