import { defineEncounter } from "../types";

// Spore beds grow wherever the water has gone stale.
export default defineEncounter({
  id: "spore-bed",
  floors: [4, 5],
  weight: 2,
  weightOn: { 4: 3 },
  groups: [{ monster: "sporecaller", count: [1, 2] }],
});
