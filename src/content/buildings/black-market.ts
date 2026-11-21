import { defineBuilding } from "../types";

/**
 * A back room behind the tavern (DESIGN.md §7, §8). It only deals with Evil
 * heroes: while the guild has one on its books it fences the haul for more
 * than the Market pays and sells unholy gear. With none, the door stays shut.
 */
export default defineBuilding({
  id: "black-market",
  name: "Black Market",
  blurb: "Fences loot and sells unholy gear, but only deals with Evil heroes.",
  startLevel: 0,
  dealsWith: ["evil"],
  levels: [
    {
      cost: 180,
      days: 3,
      summary: "Haul sells for 8% more; sells cursed blades and bone charms",
      effects: [
        { type: "fence", amount: 8 },
        { type: "sells", items: ["cursed-blade", "bone-charm"] },
      ],
    },
  ],
});
