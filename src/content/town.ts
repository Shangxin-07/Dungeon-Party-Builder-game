import { defineTownRules } from "./types";

/** How a new game starts, and the guild's house rules. Tune freely. */
export default defineTownRules({
  startingGold: 100,
  // DESIGN.md §12: 4 heroes to start, one more than fits in a party. They turn
  // up untrained: you pick their classes and kit them out from the store room.
  startingRecruits: 4,
  startingRoster: ["fighter", "scout", "mage", "fighter"],
  // Enough basic kit for two fighters, a scout and a mage, or a cleric instead.
  startingStash: [
    "sword",
    "sword",
    "short-bow",
    "staff",
    "mace",
    "chainmail",
    "leather-armor",
    "leather-armor",
    "wooden-shield",
    "wooden-shield",
    "healing-potion",
    "healing-potion",
    "healing-potion",
    "bandages",
    "bandages",
    "bandages",
  ],
  recruitsOnOffer: 3,
  hireCost: 60,
  sellRate: 0.5,
  // M6 balance pass: the Market takes a cut of loot (coins excepted).
  haulRate: 0.7,
  // A haggler with Appraisal 70 and CHA 14 gets 8% more; never above 90%.
  haggle: { perAppraisal: 0.002, perCha: 0.01, max: 0.9 },
  // Porters: cheap hands who carry loot and run for it if the party falls.
  // A floor-1 porter with average DEX and END gets home 60% of the time.
  porters: {
    hireCost: 20,
    wage: 1,
    slots: 2,
    trainAfterFights: 8,
    xpShare: 0.5,
    escape: { base: 0.6, perStat: 0.02, perFloor: 0.15 },
  },
  restPercent: 40,
  // A raid-damaged building costs a quarter of its build price to fix.
  repairRate: 0.25,
  // M6 balance pass: a level-4 hero costs 6 gold a day, so a full roster eats
  // about a third of what floor-1 trips bring in.
  wages: { base: 2, perLevel: 1 },
  // Every 3 levels a hero asks for 2 more gold a day (Gold heroes ask for 4).
  raises: { everyLevels: 3, amount: 2, patienceDays: 3 },
});
