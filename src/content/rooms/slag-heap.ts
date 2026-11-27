import { defineRoom } from "../types";

// The Ember Deeps: where something tipped its slag for a long time, and things got buried in it.
export default defineRoom({
  id: "slag-heap",
  name: "Slag heap",
  behaviour: "treasure",
  floors: [9, 9],
  weight: 2,
  descriptions: [
    "A great heap of black slag, cooled into glassy waves. Things stick out of it.",
    "Old slag tipped down a slope, years of it. Somebody worked metal down here once.",
  ],
  loot: "slag-heap",
});
