import { defineEncounter } from "../types";

// The Diggings: goblins working the old stores, with a sapper to keep others off.
export default defineEncounter({
  id: "scavenger-crew",
  floors: [1, 2],
  weight: 1,
  weightOn: { 1: 2 },
  groups: [
    { monster: "goblin", count: [1, 2] },
    { monster: "goblin-sapper", count: [1, 1] },
  ],
});
