import { defineEncounter } from "../types";

// The Bone Halls: a wight, and the dead it keeps.
export default defineEncounter({
  id: "wight-and-bones",
  floors: [3, 4],
  weight: 1,
  weightOn: { 3: 2 },
  groups: [
    { monster: "wight", count: [1, 1] },
    { monster: "restless-bones", count: [1, 2] },
  ],
});
