import { defineLevelRules } from "./types";

/** Experience and levelling (DESIGN.md §9). Tune freely. */
export default defineLevelRules({
  // The first slice stops at 10; freeform classes take it towards 50 later.
  maxLevel: 10,
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
