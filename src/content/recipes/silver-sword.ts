import { defineRecipe } from "../types";

// Silver from the Old Delve, over an iron core.
export default defineRecipe({
  id: "silver-sword",
  workshop: "blacksmith",
  level: 3,
  makes: "silver-sword",
  materials: { "iron-ore": 2, "deep-silver": 3 },
  work: 5,
  stat: "STR",
});
