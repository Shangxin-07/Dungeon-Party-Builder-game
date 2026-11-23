import { defineItem } from "../types";

export default defineItem({
  id: "leather-armor",
  name: "Leather Armour",
  icon: { sheet: "armour", cell: 2 },
  slot: "armor",
  value: 20,
  tags: ["armor", "light"],
  passives: [{ type: "modifyStat", stat: "armor", amount: 2 }],
});
