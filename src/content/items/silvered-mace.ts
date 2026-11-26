import { defineItem } from "../types";

// From a grave in the Bone Halls: a priest's mace with a silver head, made for the restless dead.
export default defineItem({
  id: "silvered-mace",
  name: "Silvered Mace",
  icon: { sheet: "loot-2", cell: 6 },
  slot: "weapon",
  value: 110,
  tags: ["mace", "melee", "silver"],
  salvage: { "deep-silver": 1, "iron-ore": 1 },
  damageType: "crushing",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "bonusVsTag", tag: "undead", percent: 40 },
  ],
});
