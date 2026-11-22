import { defineOfferRules } from "./types";

/**
 * Town news (M7.17, DESIGN.md §18.1c): about one offer every three days,
 * and never more than three waiting at once.
 */
export default defineOfferRules({
  chancePerDay: 0.35,
  max: 3,
});
