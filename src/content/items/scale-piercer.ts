import { defineItem } from "../types";

// The Behemoth's bane (DESIGN.md §17.8): a long, narrow spear head made to slide
// under a lifted scale. The Blacksmith forges it once the Library has Studied the
// beast, from what the shed scales showed them.
export default defineItem({
  id: "scale-piercer",
  name: "Scale-piercer",
  icon: { sheet: "weapons", cell: 6 },
  slot: "weapon",
  value: 140,
  tags: ["spear", "melee", "bane", "reach"],
  salvage: { "iron-ore": 2, "deep-silver": 1 },
  damageType: "piercing",
  unlock: { monster: "mire-behemoth", tier: 2 },
  passives: [
    { type: "modifyStat", stat: "attack", amount: 5 },
    { type: "bonusVsTag", tag: "behemoth", percent: 100 },
  ],
});
