import { defineRescueRules } from "./types";

/** Wipes and rescue runs (DESIGN.md §10). Tune freely. */
export default defineRescueRules({
  survival: 0.55,
  survivalPerEnd: 0.03,
  windowDays: 5,
  scavengeChance: 0.08,
  carryChance: 0.35,
  rescuedHpPercent: 25,
});
