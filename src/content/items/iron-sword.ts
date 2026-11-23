import { defineItem } from "../types";

export default defineItem({
  id: "iron-sword",
  name: "Iron Sword",
  icon: { sheet: "weapons", cell: 1 },
  slot: "weapon",
  value: 70,
  tags: ["sword", "blade", "melee"],
  salvage: { "iron-ore": 2 },
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 6 },
    { type: "modifyStat", stat: "accuracy", amount: 3 },
  ],
});
