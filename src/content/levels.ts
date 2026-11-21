import { defineLevelRules } from "./types";

/** Experience and levelling (DESIGN.md §9). Tune freely. */
export default defineLevelRules({
  // Freeform classes (DESIGN.md §9): each level goes into a class the player picks.
  maxLevel: 50,
  hpPerLevel: 1,
  xpPerPower: 3,
  xpPerFloor: 10,
  raidXpShare: 0.25,
  // Level 2 at 100 XP, 3 at 350, 4 at 720, 5 at 1210...
  xpBase: 100,
  xpGrowth: 1.8,
  perkOffers: 3,
  classPerkWeight: 2,
  freeStatEvery: 3,
  wantChance: 0.35,
});
