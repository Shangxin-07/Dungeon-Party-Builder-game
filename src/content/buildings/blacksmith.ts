import { defineBuilding } from "../types";

/**
 * Better gear for sale (DESIGN.md §8), and salvage: breaking the haul down
 * into materials (M7.03, DESIGN.md §17.4). M7.14: a workshop, where heroes at
 * home forge swords, shields and mail from ore (content/recipes/).
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
      summary:
        "Sells iron swords, war axes, longbows and iron shields. Salvages loot (60% yield). A forge with 1 bench",
      effects: [
        {
          type: "sells",
          // The scale-piercer only once the Library has Studied the Mire Behemoth (M7.08).
          items: ["iron-sword", "war-axe", "longbow", "iron-shield", "scale-piercer"],
        },
        { type: "salvage", amount: 60 },
        { type: "workshop", benches: 1 },
      ],
    },
    {
      cost: 450,
      materials: { "iron-ore": 6 },
      days: 5,
      summary:
        "Also sells scale mail and iron-shod staves. Salvage yield 80%. 2 benches; forges scale mail",
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
            "scale-piercer",
          ],
        },
        { type: "salvage", amount: 80 },
        { type: "workshop", benches: 2 },
      ],
    },
    {
      cost: 650,
      materials: { "iron-ore": 6, "deep-silver": 6 },
      days: 6,
      summary:
        "Also forges silver swords (+50% against the undead), to order too. Salvage yield 100%",
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
            "scale-piercer",
          ],
        },
        { type: "salvage", amount: 100 },
        { type: "workshop", benches: 2 },
      ],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: { plot: "south-east", shape: "house", roof: "#4b4b52", sign: "anvil", smoke: true },
});
