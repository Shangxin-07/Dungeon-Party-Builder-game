import { defineEncounter } from "../types";

// The Ember Deeps: wraiths hanging in the falling ash.
export default defineEncounter({
  id: "ash-wraiths",
  floors: [9, 9],
  weight: 2,
  groups: [{ monster: "ash-wraith", count: [2, 3] }],
});
