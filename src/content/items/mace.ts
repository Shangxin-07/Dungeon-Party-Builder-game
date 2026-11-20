import { defineItem } from "../types";

// A cleric's weapon: blunt, blessed, and bad news for bones.
export default defineItem({
  id: "mace",
  name: "Mace",
  slot: "weapon",
  value: 30,
  tags: ["mace", "melee", "holy"],
  damageType: "crushing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 3 },
    { type: "modifyStat", stat: "spellPower", amount: 2 },
  ],
});
