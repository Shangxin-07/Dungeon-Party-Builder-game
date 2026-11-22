import { defineRecipe } from "../types";

// Spider silk makes a good bowstring.
export default defineRecipe({
  id: "short-bow",
  workshop: "sawmill",
  makes: "short-bow",
  materials: { planks: 2, "spider-silk": 1 },
  work: 2,
  stat: "DEX",
});
