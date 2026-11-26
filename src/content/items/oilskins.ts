import { defineItem } from "../types";

// The Flooded Shafts: the miners' waterproofs, waxed thick. Keeps the cold out.
export default defineItem({
  id: "oilskins",
  name: "Oilskins",
  icon: { sheet: "loot-2", cell: 7 },
  slot: "armor",
  value: 40,
  tags: ["armor", "light"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "cold", percent: 30 },
  ],
});
