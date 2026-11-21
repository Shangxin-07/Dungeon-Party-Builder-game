import { defineEncounter } from "../types";

export default defineEncounter({
  id: "spider-nest",
  floors: [2, 4],
  weight: 2,
  // The Warrens are where the spiders nest: bring a scout.
  weightOn: { 2: 4 },
  groups: [{ monster: "cave-spider", count: [1, 2] }],
});
