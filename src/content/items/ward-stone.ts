import { defineItem } from "../types";

// A strange trinket the Library worked out (M7.07): blows land softer on whoever holds it.
export default defineItem({
  id: "ward-stone",
  name: "Ward Stone",
  icon: { sheet: "armour", cell: 15 },
  slot: "offhand",
  value: 150,
  tags: ["charm", "magic"],
  passives: [
    { type: "resist", damageType: "slashing", percent: 10 },
    { type: "resist", damageType: "piercing", percent: 10 },
    { type: "resist", damageType: "crushing", percent: 10 },
  ],
});
