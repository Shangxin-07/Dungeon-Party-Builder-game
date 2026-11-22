import { defineItem } from "../types";

// Unholy (DESIGN.md §7): it hits harder than honest steel and gnaws at the
// will of whoever holds it. Evil heroes enjoy carrying it; Good heroes hate it.
export default defineItem({
  id: "cursed-blade",
  name: "Cursed Blade",
  slot: "weapon",
  value: 75,
  tags: ["sword", "blade", "melee", "unholy"],
  salvage: { "iron-ore": 2, "bone-dust": 1 },
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 8 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
    { type: "modifyStat", stat: "WIL", amount: -2 },
  ],
});
