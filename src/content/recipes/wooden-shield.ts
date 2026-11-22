import { defineRecipe } from "../types";

// Cheaper than the Market (15 gold) if the timber is lying about.
export default defineRecipe({
  id: "wooden-shield",
  workshop: "sawmill",
  makes: "wooden-shield",
  materials: { planks: 2 },
  work: 1,
  stat: "DEX",
});
