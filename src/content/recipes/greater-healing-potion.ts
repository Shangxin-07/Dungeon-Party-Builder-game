import { defineRecipe } from "../types";

// Bone dust thickens it.
export default defineRecipe({
  id: "greater-healing-potion",
  workshop: "apothecary",
  level: 2,
  makes: "greater-healing-potion",
  materials: { glowcap: 1, "bone-dust": 1 },
  work: 2,
  stat: "INT",
});
