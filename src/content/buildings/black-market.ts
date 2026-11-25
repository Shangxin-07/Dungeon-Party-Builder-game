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
      summary:
        "Haul sells for 8% more; sells cursed blades and bone charms. 1 bench: forges bound Seal Stones",
      effects: [
        { type: "fence", amount: 8 },
        { type: "sells", items: ["cursed-blade", "bone-charm"] },
        // Forges bound Seal Stones (M8.17).
        { type: "workshop", benches: 1 },
      ],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: {
    plot: "inner-south-west",
    shape: "house",
    roof: "#2c2a33",
    sign: "eye",
    sprite: { sheet: "black-market", frames: [0] },
  },
});
