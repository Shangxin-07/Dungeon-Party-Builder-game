import { defineEncounter } from "../types";

// A troll guards a dry ledge above the water.
export default defineEncounter({
  id: "troll-den",
  floors: [4, 5],
  weight: 2,
  groups: [{ monster: "cave-troll", count: [1, 1] }],
});
