import { defineBackstory } from "../types";

export default defineBackstory({
  id: "smuggler",
  name: "Coast-road smuggler",
  text: "{name} ran goods past the tax men on the coast road until the tax men got better at it.",
  weight: 1,
  alignments: { good: 0.4, evil: 2 },
  passives: [
    { type: "modifyStat", stat: "DEX", amount: 1 },
    { type: "modifySkill", skill: "appraisal", amount: 5 },
  ],
  tags: ["smuggler"],
});
