import { defineRecipe } from "../types";

// Scales sewn on with spider silk.
export default defineRecipe({
  id: "scale-mail",
  workshop: "blacksmith",
  level: 2,
  makes: "scale-mail",
  materials: { "iron-ore": 4, "spider-silk": 2 },
  work: 5,
  stat: "STR",
});
