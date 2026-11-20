import { defineMoraleRules } from "./types";

/**
 * Morale rules everybody follows (DESIGN.md §6). Each hero's motivation adds
 * its own rules on top (content/motivations/). Tune freely.
 */
export default defineMoraleRules({
  start: [52, 68],
  low: 30,
  // WIL 16 takes 18% off every loss; WIL 6 adds 12%.
  stabilityPerWil: 0.03,
  // A CHA 16 leader takes another 15% off losses on a trip.
  leaderPerCha: 0.025,
  // M6 balance pass: morale settled at 85-95 for any guild that kept trips
  // safe and built favourites. Above 70, good news only counts half.
  contentAbove: { morale: 70, gainShare: 0.5 },
  dislikeChance: 0.3,
  dislikeTags: [
    "sword",
    "axe",
    "dagger",
    "bow",
    "staff",
    "mace",
    "shield",
    "heavy",
    "fire",
    "holy",
  ],
  rules: [
    // A quiet day in town settles nerves, up to a point.
    { fact: "restDay", amount: 1, below: 50, reason: "a quiet day" },
    // ...but nobody signed up to sit around: the shine of the last trip wears off.
    { fact: "restDay", amount: -1, above: 70, reason: "restless after days in town" },
    { fact: "favouriteBuilt", amount: 1, below: 70, reason: "loves the {favourite}" },
    { fact: "favouriteMissing", amount: -1, reason: "misses having a {favourite}" },
    { fact: "restMorale", amount: 1, below: 70, reason: "an evening at the Tavern" },
    { fact: "unpaid", amount: -3, reason: "wasn't paid" },
    // M6: nobody likes being worked into the ground.
    { fact: "sentTired", amount: -3, reason: "was sent down worn out" },
    { fact: "injured", amount: -2, reason: "picked up a nasty injury" },
    { fact: "raiseGiven", amount: 5, reason: "got the raise they asked for" },
    { fact: "raiseRefused", amount: -8, reason: "was refused a raise" },
    { fact: "likedGear", amount: 1, reason: "liked their gear" },
    { fact: "dislikedGear", amount: -3, reason: "hates their gear" },
    { fact: "wounded", amount: -3, reason: "came home badly hurt" },
    { fact: "sentHurt", amount: -3, reason: "was sent down before they'd healed" },
    { fact: "fallenComrades", amount: -3, cap: 9, reason: "mourning the fallen" },
    { fact: "abandoned", amount: -2, cap: 6, reason: "someone was left to die down there" },
    { fact: "rescuedComrades", amount: 2, cap: 6, reason: "the guild brought its own home" },
    { fact: "wasTrapped", amount: -10, reason: "was left trapped in the dark" },
    { fact: "wantedPerk", amount: 8, reason: "got the training they wanted" },
    { fact: "levelUp", amount: 2, reason: "levelled up" },
  ],
});
