import { defineEncounter } from "../types";

// The Ember Deeps: a slag crawler with an ash wraith over it.
export default defineEncounter({
  id: "crawler-and-wraith",
  floors: [9, 9],
  weight: 2,
  groups: [
    { monster: "slag-crawler", count: [1, 1] },
    { monster: "ash-wraith", count: [1, 1] },
  ],
});
