import { defineItem } from "../types";

// A strange trinket the Library worked out (M7.07): a miner's luck piece that still works.
export default defineItem({
  id: "lucky-charm",
  name: "Miner's Luck",
  icon: { sheet: "armour", cell: 9 },
  slot: "offhand",
  value: 120,
  tags: ["charm", "magic"],
  passives: [
    { type: "modifyStat", stat: "accuracy", amount: 2 },
    { type: "modifyStat", stat: "evasion", amount: 2 },
  ],
});
