import { defineEncounter } from "../types";

export default defineEncounter({
  id: "rat-swarm",
  floors: [1, 2],
  weight: 3,
  groups: [{ monster: "giant-rat", count: [3, 5] }],
});
