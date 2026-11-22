import { defineItem } from "../types";

export default defineItem({
  id: "iron-shield",
  name: "Iron Shield",
  slot: "offhand",
  value: 45,
  tags: ["shield", "heavy", "noisy"],
  salvage: { "iron-ore": 3 },
  abilities: ["shield-bash"],
  passives: [
    // Noisy (M7.08): a sneak party goes by its loudest member.
    { type: "modifySkill", skill: "stealth", amount: -10 },
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "modifyStat", stat: "evasion", amount: 1 },
  ],
});
