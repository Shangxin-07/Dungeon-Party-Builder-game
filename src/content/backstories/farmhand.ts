import { defineBackstory } from "../types";

export default defineBackstory({
  id: "farmhand",
  name: "Farmhand",
  text: "{name} left the farm for something better. So far it's mostly been worse, but louder.",
  weight: 3,
  passives: [{ type: "modifyStat", stat: "STR", amount: 1 }],
  tags: ["farm"],
});
