import { defineItem } from "../types";

export default defineItem({
  id: "silver-ring",
  name: "Silver Ring",
  icon: { sheet: "armour", cell: 11 },
  slot: "loot",
  value: 35,
  valueRange: [20, 60],
  tags: ["jewellery", "valuable"],
  salvage: { "deep-silver": 1 },
});
