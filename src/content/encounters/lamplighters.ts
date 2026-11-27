import { defineEncounter } from "../types";

// The Coal Halls: Lamplighters on their round.
export default defineEncounter({
  id: "lamplighters",
  floors: [7, 7],
  weight: 2,
  groups: [{ monster: "lamplighter", count: [2, 3] }],
});
