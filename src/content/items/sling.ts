import { defineItem } from "../types";

// A strap and a pocketful of rocks from the spoil heap.
export default defineItem({
  id: "sling",
  name: "Sling",
  icon: { sheet: "weapons", cell: 15 },
  slot: "weapon",
  value: 8,
  tags: ["ranged", "makeshift"],
  damageType: "crushing",
  ranged: true,
  passives: [{ type: "modifyStat", stat: "attack", amount: 2 }],
});
