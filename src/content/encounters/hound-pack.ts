import { defineEncounter } from "../types";

// The Warrens: tunnel hounds hunt in packs.
export default defineEncounter({
  id: "hound-pack",
  floors: [2, 3],
  weight: 1,
  weightOn: { 2: 3 },
  groups: [{ monster: "tunnel-hound", count: [2, 3] }],
});
