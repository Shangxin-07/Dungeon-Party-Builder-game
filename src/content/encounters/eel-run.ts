import { defineEncounter } from "../types";

// The Flooded Shafts: an eel in the deep water and leeches in the shallows.
export default defineEncounter({
  id: "eel-run",
  floors: [4, 5],
  weight: 1,
  weightOn: { 4: 2 },
  groups: [
    { monster: "shaft-eel", count: [1, 2] },
    { monster: "leech", count: [1, 3] },
  ],
});
