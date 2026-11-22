import { defineItem } from "../types";

export default defineItem({
  id: "scale-mail",
  name: "Scale Mail",
  slot: "armor",
  value: 120,
  tags: ["armor", "heavy"],
  salvage: { "iron-ore": 5 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 6 },
    { type: "modifyStat", stat: "evasion", amount: -3 },
  ],
});
