import { defineRecipe } from "../types";

// Spider silk is clean and strong: good for dressings.
export default defineRecipe({
  id: "bandages",
  workshop: "apothecary",
  makes: "bandages",
  count: 4,
  name: "4 rolls of bandages",
  materials: { "spider-silk": 1 },
  work: 1,
  stat: "INT",
});
