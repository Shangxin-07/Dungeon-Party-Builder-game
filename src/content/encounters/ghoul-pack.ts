import { defineEncounter } from "../types";

// Ghouls hunt in packs through the flooded galleries.
export default defineEncounter({
  id: "ghoul-pack",
  floors: [4, 6],
  weight: 3,
  weightOn: { 4: 4 },
  groups: [{ monster: "ghoul", count: [1, 2] }],
});
