import { defineEncounter } from "../types";

// The Old Delve: a golem walking the old vein.
export default defineEncounter({
  id: "ore-golem",
  floors: [5, 6],
  weight: 1,
  groups: [{ monster: "ore-golem", count: [1, 1] }],
});
