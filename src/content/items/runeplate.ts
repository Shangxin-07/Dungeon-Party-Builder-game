import { defineItem } from "../types";

// The Old Delve: the old foreman's crew had the best of it. Iron plate with deep-silver runes cut into it.
export default defineItem({
  id: "runeplate",
  name: "Delver's Runeplate",
  icon: { sheet: "loot-2", cell: 10 },
  slot: "armor",
  value: 170,
  tags: ["armor", "heavy", "silver"],
  salvage: { "deep-silver": 2, "iron-bands": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 7 },
    { type: "modifyStat", stat: "evasion", amount: -1 },
    { type: "resist", damageType: "cold", percent: 15 },
  ],
});
