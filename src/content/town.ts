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
  // M7.03: what the Blacksmith gets out of an item with no salvage list.
  salvage: {
    byTag: {
      metal: { "iron-ore": 1 },
      silver: { "deep-silver": 1 },
      bone: { "bone-dust": 1 },
      wood: { timber: 1 },
      cloth: { "spider-silk": 1 },
    },
  },
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
  // M7.12 (DESIGN.md §18.2): adventurers are paid like adventurers. At home a
  // hero draws a retainer (a level-4 hero 2 gold a day, where the old wage was
  // 6); on a trip the party takes a share of the haul instead, so a failed
  // trip costs nothing and an idle guild still slowly goes broke. Days bot
  // (camp, floor 1, two parties): pay was 25% of income on wages, now 17%.
  retainer: { base: 1, levelsPerGold: 3 },
  shares: { percent: 15, porter: 0.5 },
  // Every 3 levels a hero asks for 1 more gold a day on their retainer; Gold
  // heroes ask for half a share more of every haul instead.
  raises: { everyLevels: 3, amount: 1, share: 0.5, patienceDays: 3 },
  // Two parties on file, so one can rest while the other goes down.
  savedParties: 2,
  // Five average heroes resting in town double the builders' pace; never more.
  helpers: { perHero: 0.2, perStr: 0.05, maxPerDay: 1 },
  // Fallen raiders drop materials (DESIGN.md §8).
  raidSpoils: "pit-spoils",
});
