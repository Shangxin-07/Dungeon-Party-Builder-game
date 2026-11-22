import { defineRescueRules } from "./types";

/** Wipes and rescue runs (DESIGN.md §10). Tune freely. */
export default defineRescueRules({
  survival: 0.55,
  survivalPerEnd: 0.03,
  windowDays: 5,
  scavengeChance: 0.08,
  carryChance: 0.35,
  rescuedHpPercent: 25,
  overdueDays: 1,
  lostDays: 2,
  giveUpDays: 8,
  holeUp: {
    minFloor: 2,
    weakBelow: 25,
    baseDays: 3,
    medicinePerDay: 25,
    maxDays: 6,
    foundChance: 0.15,
    healPercent: 10,
  },
  rescuePace: 0.5,
  slipBase: -20,
  slipMax: 0.8,
});
