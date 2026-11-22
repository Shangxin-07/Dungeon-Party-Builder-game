import { defineStealthRules } from "./types";

/**
 * Sneak missions (M7.08, DESIGN.md §17.8). A quiet pair (worst Stealth 60)
 * gets past a goblin band (PER 10: hearing 50) about 60% of the time, and
 * past the nearly deaf Mire Behemoth (hearing 5) nearly always. A party in
 * chainmail has much less chance. Tune freely.
 */
export default defineStealthRules({
  base: 0.5,
  min: 0.05,
  max: 0.95,
  quietParty: 2,
  perExtraHero: 5,
  earPerPer: 5,
});
