import { defineFallenRules } from "./types";

/** What becomes of the dead (DESIGN.md §10). Tune freely. */
export default defineFallenRules({
  // A body left down there for a week gets up again.
  riseDays: 7,
  transform: "risen",
  meetChance: 0.35,
  // Like any monster, the risen push upwards towards the pit (DESIGN.md §4).
  climbDays: 10,
  recogniseBase: 0.2,
  resurrectedHpPercent: 30,
});
