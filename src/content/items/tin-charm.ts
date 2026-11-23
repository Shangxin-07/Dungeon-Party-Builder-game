import { defineItem } from "../types";

// What most strange trinkets turn out to be, once someone looks properly (M7.07).
export default defineItem({
  id: "tin-charm",
  name: "Tin Charm",
  icon: { sheet: "armour", cell: 10 },
  slot: "loot",
  value: 3,
  valueRange: [1, 5],
  tags: ["junk", "metal"],
});
