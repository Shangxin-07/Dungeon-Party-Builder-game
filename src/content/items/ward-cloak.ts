import { defineItem } from "../types";

// The Keepers' Stair: a grey cloak with ward-lines stitched into the hem. The heat slides off it.
export default defineItem({
  id: "ward-cloak",
  name: "Ward-stitched Cloak",
  icon: { sheet: "keepers", cell: 5 },
  slot: "armor",
  value: 150,
  tags: ["armor", "light"],
  salvage: { "spider-silk": 2 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "modifyStat", stat: "evasion", amount: 2 },
    { type: "resist", damageType: "fire", percent: 30 },
  ],
});
