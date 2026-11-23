import { defineItem } from "../types";

export default defineItem({
  id: "coins",
  name: "Handful of Coins",
  icon: { sheet: "armour", cell: 14 },
  slot: "loot",
  value: 10,
  valueRange: [6, 14],
  tags: ["coins"],
});
