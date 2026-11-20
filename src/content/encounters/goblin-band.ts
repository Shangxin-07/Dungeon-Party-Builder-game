import { defineEncounter } from "../types";

export default defineEncounter({
  id: "goblin-band",
  floors: [1, 3],
  weight: 3,
  groups: [
    { monster: "goblin", count: [1, 2] },
    { monster: "goblin-archer", count: [1, 1] },
  ],
});
