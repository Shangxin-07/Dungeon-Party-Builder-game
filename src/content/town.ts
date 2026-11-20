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
  // M6 balance pass: the Market takes a cut of loot (coins excepted).
  haulRate: 0.7,
  restPercent: 40,
  // A raid-damaged building costs a quarter of its build price to fix.
  repairRate: 0.25,
  // M6 balance pass: a level-4 hero costs 6 gold a day, so a full roster eats
  // about a third of what floor-1 trips bring in.
  wages: { base: 2, perLevel: 1 },
  // Every 3 levels a hero asks for 2 more gold a day (Gold heroes ask for 4).
  raises: { everyLevels: 3, amount: 2, patienceDays: 3 },
});
