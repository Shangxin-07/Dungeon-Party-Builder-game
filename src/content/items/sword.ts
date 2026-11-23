import { defineItem } from "../types";

export default defineItem({
  id: "sword",
  name: "Sword",
  icon: { sheet: "weapons", cell: 0 },
  slot: "weapon",
  value: 30,
  tags: ["sword", "blade", "melee"],
  salvage: { "iron-ore": 2 },
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 4 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
  ],
});
