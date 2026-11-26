import { defineBackstory } from "../types";

export default defineBackstory({
  id: "scholar",
  name: "Runaway scholar",
  text: "{name} left a library in the city to see the real thing, and has the notebook to prove it.",
  weight: 1,
  passives: [
    { type: "modifyStat", stat: "INT", amount: 1 },
    { type: "modifySkill", skill: "lore", amount: 8 },
  ],
  tags: ["scholar"],
});
