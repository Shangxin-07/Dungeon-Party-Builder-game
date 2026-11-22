import { defineRecipe } from "../types";

// A straight length of ash, turned.
export default defineRecipe({
  id: "staff",
  workshop: "sawmill",
  makes: "staff",
  materials: { planks: 2 },
  work: 1,
  stat: "DEX",
});
