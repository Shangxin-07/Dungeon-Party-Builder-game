import { defineEncounter } from "../types";

// The Flooded Shafts: a shift that never came up.
export default defineEncounter({
  id: "drowned-crew",
  floors: [4, 5],
  weight: 1,
  weightOn: { 4: 3 },
  groups: [{ monster: "drowned-miner", count: [2, 3] }],
});
