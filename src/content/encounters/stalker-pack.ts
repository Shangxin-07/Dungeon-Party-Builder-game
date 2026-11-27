import { defineEncounter } from "../types";

// The Glimmering: stalkers hunting in the thrown light.
export default defineEncounter({
  id: "stalker-pack",
  floors: [8, 8],
  weight: 3,
  groups: [{ monster: "glimmer-stalker", count: [1, 2] }],
});
