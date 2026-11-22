import { defineBuilding } from "../types";

/**
 * Better gear for sale (DESIGN.md §8), and salvage: breaking the haul down
 * into materials (M7.03, DESIGN.md §17.4). Repairs and upgrades come later.
 */
export default defineBuilding({
  id: "blacksmith",
  name: "Blacksmith",
  blurb: "Proper steel, made to order.",
  startLevel: 0,
  levels: [
    {
      cost: 200,
      materials: { "iron-ore": 3 },
      days: 3,
      summary: "Sells iron swords, war axes, longbows and iron shields. Salvages loot (60% yield)",
      effects: [
        { type: "sells", items: ["iron-sword", "war-axe", "longbow", "iron-shield"] },
        { type: "salvage", amount: 60 },
      ],
    },
    {
      cost: 450,
      materials: { "iron-ore": 6 },
      days: 5,
      summary: "Also sells scale mail and iron-shod staves. Salvage yield 80%",
      effects: [
        {
          type: "sells",
          items: ["iron-sword", "war-axe", "longbow", "iron-shield", "scale-mail", "iron-staff"],
        },
        { type: "salvage", amount: 80 },
      ],
    },
    {
      cost: 650,
      materials: { "iron-ore": 6, "deep-silver": 6 },
      days: 6,
      summary: "Also forges silver swords (+50% against the undead). Salvage yield 100%",
      effects: [
        {
          type: "sells",
          items: [
            "iron-sword",
            "war-axe",
            "longbow",
            "iron-shield",
            "scale-mail",
            "iron-staff",
            "silver-sword",
          ],
        },
        { type: "salvage", amount: 100 },
      ],
    },
  ],
});
