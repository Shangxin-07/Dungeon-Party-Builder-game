import { defineEncounter } from "../types";

// The Coal Halls: A stoker on its own, shovelling at nothing.
export default defineEncounter({
  id: "lone-stoker",
  floors: [7, 7],
  weight: 1,
  groups: [{ monster: "stoker", count: [1, 1] }],
});
