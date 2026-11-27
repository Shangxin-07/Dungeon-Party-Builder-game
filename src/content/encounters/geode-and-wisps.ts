import { defineEncounter } from "../types";

// The Glimmering: a geode hulk, and wisps living in its cracks.
export default defineEncounter({
  id: "geode-and-wisps",
  floors: [8, 9],
  weight: 2,
  groups: [
    { monster: "geode-hulk", count: [1, 1] },
    { monster: "prism-wisp", count: [1, 2] },
  ],
});
