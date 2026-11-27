import { defineEncounter } from "../types";

// The Coal Halls: Ash moths, drawn to the party's lamps.
export default defineEncounter({
  id: "moth-swarm",
  floors: [7, 8],
  weight: 2,
  groups: [{ monster: "ash-moth", count: [3, 5] }],
});
