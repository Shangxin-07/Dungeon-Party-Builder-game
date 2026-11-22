import { defineRecipe } from "../types";

// 70 gold at the Market; 36 gold of ore and three days at the forge.
export default defineRecipe({
  id: "iron-sword",
  workshop: "blacksmith",
  makes: "iron-sword",
  materials: { "iron-ore": 3 },
  work: 3,
  stat: "STR",
});
