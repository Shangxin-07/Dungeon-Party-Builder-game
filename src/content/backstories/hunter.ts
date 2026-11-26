import { defineBackstory } from "../types";

export default defineBackstory({
  id: "hunter",
  name: "Valley hunter",
  text: "{name} hunted the valley woods until there was more money in hunting under them.",
  weight: 2,
  passives: [
    { type: "modifyStat", stat: "PER", amount: 1 },
    { type: "modifySkill", skill: "scouting", amount: 8 },
  ],
  tags: ["hunter"],
});
