import { defineEncounter } from "../types";

// The Warrens: a web lurker or two, in the roof of a burrow.
export default defineEncounter({
  id: "lurker-web",
  floors: [2, 3],
  weight: 1,
  weightOn: { 2: 2 },
  groups: [{ monster: "web-lurker", count: [1, 2] }],
});
