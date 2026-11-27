import { defineEncounter } from "../types";

// The Keepers' Stair: hounds come up out of the heat below in packs.
export default defineEncounter({
  id: "cinder-pack",
  floors: [6, 6],
  weight: 3,
  groups: [{ monster: "cinder-hound", count: [2, 3] }],
});
