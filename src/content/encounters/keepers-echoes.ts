import { defineEncounter } from "../types";

// The Keepers' Stair: echoes that still keep the wards, together.
export default defineEncounter({
  id: "keepers-echoes",
  floors: [6, 6],
  weight: 2,
  groups: [{ monster: "keepers-echo", count: [2, 3] }],
});
