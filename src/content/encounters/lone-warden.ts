import { defineEncounter } from "../types";

// The Keepers' Stair: a warden walking its round alone.
export default defineEncounter({
  id: "lone-warden",
  floors: [6, 6],
  weight: 1,
  groups: [{ monster: "stair-warden", count: [1, 1] }],
});
