import { defineLeadershipRules } from "./types";

/** Leaders and command (M7.05, DESIGN.md §17.5). Tune freely. */
export default defineLeadershipRules({
  // Most heroes start between Leadership 40 and 65 (CHA + WIL, ×2.5).
  command: [
    { from: 0, command: 3 },
    { from: 40, command: 4 },
    { from: 55, command: 5 },
    { from: 70, command: 6 },
    { from: 82, command: 7 },
    { from: 92, command: 8 },
  ],
  alignCost: [1, 1.5, 2],
  perTrip: 2,
  slowAbove: 70,
  slowShare: 0.5,
  disobey: { perOver: 0.08, stepFactor: [1, 1.5, 2.5], maxChance: 0.5 },
  morale: { at: 50, min: 0.5, max: 2 },
  desert: {
    perOver: 0.05,
    badFight: 1.3,
    maxChance: 0.35,
    // Evil heroes are the likeliest to run, Good ones almost never.
    align: { good: 0.1, neutral: 1, evil: 2 },
  },
  bigWin: 1.4,
  leaderFalls: 0.4,
  // About +18% fight power per hero over 4 (DESIGN.md §17.5).
  scaling: { over: 4, perFighter: 0.18 },
  maxTraits: 3,
  streak: 5,
  traitChance: { lostSomeone: 0.6, bigWin: 0.4, longStreak: 0.5, deserted: 1 },
  grudge: { motivations: ["comrades"], alignments: ["good"] },
});
