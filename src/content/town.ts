import { defineTownRules } from "./types";

/** How a new game starts, and the guild's house rules. Tune freely. */
export default defineTownRules({
  startingGold: 100,
  // DESIGN.md §12: a starting roster of 4 recruits, one more than fits in a party.
  startingRoster: ["fighter", "scout", "mage", "fighter"],
  startingStash: ["bandages", "bandages"],
  recruitsOnOffer: 3,
  hireCost: 60,
  sellRate: 0.5,
  restPercent: 40,
});
