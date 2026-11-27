import { defineEncounter } from "../types";

// The Glimmering: a cloud of wisps hanging in a crystal hall.
export default defineEncounter({
  id: "wisp-cloud",
  floors: [8, 8],
  weight: 2,
  groups: [{ monster: "prism-wisp", count: [2, 4] }],
});
