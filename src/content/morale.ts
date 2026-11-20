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
  dislikeChance: 0.3,
  dislikeTags: ["sword", "axe", "dagger", "bow", "staff", "shield", "heavy", "fire"],
  rules: [
    // A quiet day in town settles nerves, up to a point.
    { fact: "restDay", amount: 1, below: 50, reason: "a quiet day" },
    { fact: "favouriteBuilt", amount: 1, below: 80, reason: "loves the {favourite}" },
    { fact: "favouriteMissing", amount: -1, reason: "misses having a {favourite}" },
    { fact: "restMorale", amount: 1, below: 75, reason: "an evening at the Tavern" },
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
