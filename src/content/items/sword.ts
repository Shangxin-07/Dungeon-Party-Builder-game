import { defineItem } from "../types";

export default defineItem({
  id: "sword",
  name: "Sword",
  slot: "weapon",
  value: 30,
  tags: ["sword", "blade", "melee"],
  damageType: "slashing",
  abilities: ["disarm"],
  passives: [
    { type: "modifyStat", stat: "attack", amount: 4 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
  ],
});
