import { defineBackstory } from "../types";

export default defineBackstory({
  id: "grave-digger",
  name: "Grave-digger",
  text: "{name} dug the town's graves before the guild came, and has buried a few people who didn't stay buried.",
  weight: 1,
  passives: [
    { type: "modifyStat", stat: "END", amount: 1 },
    { type: "modifySkill", skill: "lore", amount: 5 },
  ],
  tags: ["graves", "camp-born"],
});
