import { defineEncounter } from "../types";

// The Coal Halls: Stokers at work, with a lamplighter behind.
export default defineEncounter({
  id: "stoker-gang",
  floors: [7, 8],
  weight: 3,
  groups: [
    { monster: "stoker", count: [1, 2] },
    { monster: "lamplighter", count: [1, 1] },
  ],
});
