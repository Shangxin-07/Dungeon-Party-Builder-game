import { defineBackstory } from "../types";

export default defineBackstory({
  id: "disgraced-noble",
  name: "Disgraced noble",
  text: "{name} has a family name nobody here has heard of, and debts everybody back home has.",
  weight: 1,
  passives: [
    { type: "modifyStat", stat: "CHA", amount: 1 },
    { type: "modifySkill", skill: "appraisal", amount: 8 },
  ],
  tags: ["noble"],
});
