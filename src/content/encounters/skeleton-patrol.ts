import { defineEncounter } from "../types";

export default defineEncounter({
  id: "skeleton-patrol",
  floors: [2, 5],
  weight: 2,
  // The Bone Halls belong to the dead: bring a mace, an axe or a cleric.
  weightOn: { 3: 5, 4: 1 },
  groups: [{ monster: "skeleton", count: [1, 2] }],
});
