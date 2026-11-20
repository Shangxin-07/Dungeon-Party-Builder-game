import { defineBuilding } from "../types";

/** Basic gear and supplies. Built from the start (DESIGN.md §8). */
export default defineBuilding({
  id: "market",
  name: "Market",
  blurb: "Basic gear and supplies. Buys anything you bring back, at a price.",
  startLevel: 1,
  levels: [
    {
      cost: 0,
      days: 0,
      summary: "Sells basic weapons, armour, potions and bandages",
      effects: [
        {
          type: "sells",
          items: [
            "healing-potion",
            "bandages",
            "dagger",
            "sword",
            "axe",
            "short-bow",
            "staff",
            "leather-armor",
            "chainmail",
            "wooden-shield",
          ],
        },
      ],
    },
  ],
});
