import { defineItem } from "../types";

// The opening (DESIGN.md §8): whoever is holding the pick-axe is the fighter.
export default defineItem({
  id: "pick-axe",
  name: "Pick-axe",
  slot: "weapon",
  value: 12,
  tags: ["axe", "heavy", "melee", "makeshift"],
  damageType: "piercing",
  passives: [{ type: "modifyStat", stat: "attack", amount: 3 }],
});
