import { defineRecipe } from "../types";

// Glowcap from the deep floors, steeped.
export default defineRecipe({
  id: "healing-potion",
  workshop: "apothecary",
  makes: "healing-potion",
  count: 2,
  materials: { glowcap: 1 },
  work: 1,
  stat: "INT",
});
