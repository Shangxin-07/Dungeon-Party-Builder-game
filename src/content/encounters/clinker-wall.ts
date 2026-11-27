import { defineEncounter } from "../types";

// The Kiln: clinker golems holding up the walls.
export default defineEncounter({
  id: "clinker-wall",
  floors: [10, 10],
  weight: 3,
  groups: [{ monster: "clinker-golem", count: [1, 2] }],
});
