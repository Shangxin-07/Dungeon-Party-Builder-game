import { defineItem } from "../types";

// Off an old pit pony's harness. Worth something to the right buyer.
export default defineItem({
  id: "brass-fittings",
  name: "Brass Fittings",
  icon: { sheet: "loot-2", cell: 2 },
  slot: "loot",
  value: 14,
  valueRange: [8, 20],
  tags: ["metal"],
});
