import { defineEncounter } from "../types";

// The Old Delve: crawlers the heart's crystal grew into.
export default defineEncounter({
  id: "crystal-brood",
  floors: [5, 5],
  weight: 2,
  groups: [{ monster: "crystal-crawler", count: [1, 2] }],
});
