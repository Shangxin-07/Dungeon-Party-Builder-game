import { defineItem } from "../types";

export default defineItem({
  id: "dagger",
  name: "Dagger",
  slot: "weapon",
  value: 15,
  tags: ["dagger", "blade", "melee", "light"],
  salvage: { "iron-ore": 1 },
  damageType: "piercing",
  abilities: ["backstab"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 2 },
    { type: "modifyStat", stat: "accuracy", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: 2 },
  ],
});
