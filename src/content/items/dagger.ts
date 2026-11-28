import { defineItem } from "../types";

export default defineItem({
  id: "dagger",
  name: "Dagger",
  icon: { sheet: "weapons", cell: 5 },
  slot: "weapon",
  value: 15,
  // "finesse" (M9.04): hits from DEX or STR, whichever is higher.
  tags: ["dagger", "blade", "melee", "light", "finesse"],
  salvage: { "iron-ore": 1 },
  damageType: "piercing",
  abilities: ["backstab"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 2 },
    { type: "modifyStat", stat: "accuracy", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: 2 },
  ],
});
