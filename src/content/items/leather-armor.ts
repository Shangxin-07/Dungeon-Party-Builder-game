import { defineItem } from "../types";

export default defineItem({
  id: "leather-armor",
  name: "Leather Armour",
  slot: "armor",
  value: 20,
  tags: ["armor", "light"],
  passives: [{ type: "modifyStat", stat: "armor", amount: 2 }],
});
