import { defineEncounter } from "../types";

export default defineEncounter({
  id: "slimes",
  floors: [1, 2],
  weight: 2,
  groups: [{ monster: "slime", count: [1, 2] }],
});
