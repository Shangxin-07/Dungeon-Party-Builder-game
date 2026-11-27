import { defineEncounter } from "../types";

// The Glimmering: a geode hulk on its own, standing like a boulder.
export default defineEncounter({
  id: "lone-hulk",
  floors: [8, 8],
  weight: 1,
  groups: [{ monster: "geode-hulk", count: [1, 1] }],
});
