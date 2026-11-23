import { defineItem } from "../types";

// The opening (DESIGN.md §8): whoever is holding the pick-axe is the fighter.
export default defineItem({
  id: "pick-axe",
  name: "Pick-axe",
  icon: { sheet: "weapons", cell: 10 },
  slot: "weapon",
  value: 12,
  tags: ["axe", "heavy", "melee", "makeshift"],
  salvage: { "iron-ore": 1, timber: 1 },
  damageType: "piercing",
  passives: [{ type: "modifyStat", stat: "attack", amount: 3 }],
});
