import { defineRecipe } from "../types";

// Rings and more rings.
export default defineRecipe({
  id: "chainmail",
  workshop: "blacksmith",
  makes: "chainmail",
  materials: { "iron-ore": 3 },
  work: 3,
  stat: "STR",
});
