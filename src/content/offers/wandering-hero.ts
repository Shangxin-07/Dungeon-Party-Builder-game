import { defineOffer } from "../types";

// Someone worth having (M7.17): the best of many rolls, kitted, free, but
// only stays where their favourite building stands.
export default defineOffer({
  id: "wandering-hero",
  kind: "visitor",
  name: "A hero passing through",
  text: "is passing through. They've heard of the guild, and would stay if the town had what they like.",
  weight: 1,
  days: 3,
  minDay: 10,
  picks: 10,
});
