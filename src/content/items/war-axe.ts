import { defineItem } from "../types";

// Like the axe, only more so.
export default defineItem({
  id: "war-axe",
  name: "War Axe",
  icon: { sheet: "weapons", cell: 8 },
  slot: "weapon",
  value: 75,
  tags: ["axe", "heavy", "noisy", "melee"],
  salvage: { "iron-ore": 3, timber: 1 },
  damageType: "slashing",
  abilities: ["cleave"],
  passives: [
    // Noisy (M7.08): a sneak party goes by its loudest member.
    { type: "modifySkill", skill: "stealth", amount: -10 },
    { type: "modifyStat", stat: "attack", amount: 7 },
    { type: "bonusVsTag", tag: "undead", percent: 50 },
  ],
});
