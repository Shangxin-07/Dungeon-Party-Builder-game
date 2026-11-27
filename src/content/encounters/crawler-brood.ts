import { defineEncounter } from "../types";

// The Ember Deeps: slag crawlers, in ones and twos.
export default defineEncounter({
  id: "crawler-brood",
  floors: [9, 10],
  weight: 3,
  groups: [{ monster: "slag-crawler", count: [1, 2] }],
});
