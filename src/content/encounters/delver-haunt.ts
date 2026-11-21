import { defineEncounter } from "../types";

// The Old Delve belongs to the miners who never came up: bring holy things.
export default defineEncounter({
  id: "delver-haunt",
  floors: [5, 5],
  weight: 2,
  weightOn: { 5: 5 },
  groups: [{ monster: "lost-delver", count: [1, 2] }],
});
