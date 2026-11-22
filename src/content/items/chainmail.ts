import { defineItem } from "../types";

export default defineItem({
  id: "chainmail",
  name: "Chainmail",
  slot: "armor",
  value: 60,
  tags: ["armor", "heavy", "noisy"],
  salvage: { "iron-ore": 4 },
  passives: [
    // Noisy (M7.08): a sneak party goes by its loudest member.
    { type: "modifySkill", skill: "stealth", amount: -15 },
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "evasion", amount: -3 },
  ],
});
