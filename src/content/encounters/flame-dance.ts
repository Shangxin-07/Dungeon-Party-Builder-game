import { defineEncounter } from "../types";

// The Kiln: flames dancing loose in the heat.
export default defineEncounter({
  id: "flame-dance",
  floors: [10, 10],
  weight: 2,
  groups: [{ monster: "flame-dancer", count: [2, 3] }],
});
