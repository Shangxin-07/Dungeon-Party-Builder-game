import { defineBackstory } from "../types";

export default defineBackstory({
  id: "pilgrim",
  name: "Pilgrim",
  text: "{name} came to see the miners' shrine, heard the stories about the stone, and stayed.",
  weight: 1,
  alignments: { good: 1.5 },
  passives: [
    { type: "modifyStat", stat: "WIL", amount: 1 },
    { type: "modifySkill", skill: "lore", amount: 5 },
  ],
  tags: ["faith"],
});
