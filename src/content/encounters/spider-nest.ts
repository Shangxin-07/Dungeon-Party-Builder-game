import { defineEncounter } from "../types";

export default defineEncounter({
  id: "spider-nest",
  floors: [2, 3],
  weight: 2,
  groups: [{ monster: "cave-spider", count: [1, 2] }],
});
