import { defineRecipe } from "../types";

// Straps and hinges for an iron-bound gate (M7.16): ore in, bands out.
export default defineRecipe({
  id: "iron-bands",
  workshop: "blacksmith",
  makes: "iron-bands",
  count: 2,
  name: "2 sets of iron bands",
  materials: { "iron-ore": 2 },
  work: 1,
  stat: "STR",
});
