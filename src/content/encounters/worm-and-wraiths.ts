import { defineEncounter } from "../types";

// The Ember Deeps: an ember worm heaving through the ash, wraiths drifting behind it.
export default defineEncounter({
  id: "worm-and-wraiths",
  floors: [9, 10],
  weight: 2,
  groups: [
    { monster: "ember-worm", count: [1, 1] },
    { monster: "ash-wraith", count: [1, 2] },
  ],
});
