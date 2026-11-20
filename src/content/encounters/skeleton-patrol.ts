import { defineEncounter } from "../types";

export default defineEncounter({
  id: "skeleton-patrol",
  floors: [2, 3],
  weight: 2,
  groups: [{ monster: "skeleton", count: [1, 2] }],
});
