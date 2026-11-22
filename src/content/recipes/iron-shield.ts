import { defineRecipe } from "../types";

// Iron over a plank backing.
export default defineRecipe({
  id: "iron-shield",
  workshop: "blacksmith",
  makes: "iron-shield",
  materials: { "iron-ore": 2, planks: 1 },
  work: 2,
  stat: "STR",
});
