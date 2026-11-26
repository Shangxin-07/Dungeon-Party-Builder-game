import { defineItem } from "../types";

// Unholy (DESIGN.md §7): armour laced from the Bone Halls' own dead. It turns a
// blade and keeps out the grave cold. Evil heroes don't mind; Good heroes hate it.
export default defineItem({
  id: "bone-mail",
  name: "Bone Mail",
  icon: { sheet: "loot-2", cell: 5 },
  slot: "armor",
  value: 55,
  tags: ["armor", "unholy"],
  salvage: { "bone-dust": 2 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "resist", damageType: "cold", percent: 25 },
  ],
});
