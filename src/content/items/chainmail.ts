import { defineItem } from "../types";

export default defineItem({
  id: "chainmail",
  name: "Chainmail",
  slot: "armor",
  value: 60,
  tags: ["armor", "heavy"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "evasion", amount: -3 },
  ],
});
