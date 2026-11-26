import { defineEncounter } from "../types";

// The Bone Halls: the town's own dead, up and walking.
export default defineEncounter({
  id: "restless-dead",
  floors: [3, 4],
  weight: 1,
  weightOn: { 3: 3 },
  groups: [{ monster: "restless-bones", count: [2, 3] }],
});
