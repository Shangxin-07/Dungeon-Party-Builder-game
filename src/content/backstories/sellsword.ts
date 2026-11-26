import { defineBackstory } from "../types";

export default defineBackstory({
  id: "sellsword",
  name: "Sellsword",
  text: "{name} has fought for anyone who paid, and a few who didn't.",
  weight: 2,
  alignments: { good: 0.6 },
  passives: [
    { type: "modifyStat", stat: "STR", amount: 1 },
    { type: "modifySkill", skill: "leadership", amount: 3 },
  ],
  tags: ["soldier"],
});
