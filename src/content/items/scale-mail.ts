import { defineItem } from "../types";

export default defineItem({
  id: "scale-mail",
  name: "Scale Mail",
  icon: { sheet: "armour", cell: 5 },
  slot: "armor",
  value: 120,
  tags: ["armor", "heavy", "noisy"],
  salvage: { "iron-ore": 5 },
  passives: [
    // Noisy (M7.08): a sneak party goes by its loudest member.
    { type: "modifySkill", skill: "stealth", amount: -20 },
    { type: "modifyStat", stat: "armor", amount: 6 },
    { type: "modifyStat", stat: "evasion", amount: -3 },
  ],
});
