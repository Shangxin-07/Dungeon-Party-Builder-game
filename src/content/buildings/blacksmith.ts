import { defineBuilding } from "../types";

/** Better gear for sale (DESIGN.md §8). Repairs and upgrades come later. */
export default defineBuilding({
  id: "blacksmith",
  name: "Blacksmith",
  blurb: "Proper steel, made to order.",
  startLevel: 0,
  levels: [
    {
      cost: 200,
      summary: "Sells iron swords, war axes, longbows and iron shields",
      effects: [{ type: "sells", items: ["iron-sword", "war-axe", "longbow", "iron-shield"] }],
    },
    {
      cost: 450,
      summary: "Also sells scale mail and iron-shod staves",
      effects: [
        {
          type: "sells",
          items: ["iron-sword", "war-axe", "longbow", "iron-shield", "scale-mail", "iron-staff"],
        },
      ],
    },
  ],
});
