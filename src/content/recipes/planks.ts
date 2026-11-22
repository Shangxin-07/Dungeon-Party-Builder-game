import { defineRecipe } from "../types";

// Two planks from a log.
export default defineRecipe({
  id: "planks",
  workshop: "sawmill",
  makes: "planks",
  count: 2,
  materials: { timber: 1 },
  work: 1,
  stat: "STR",
});
