import { defineResearchRules } from "./types";

/** Research at the Library (M7.07, DESIGN.md §17.7). Tune freely. */
export default defineResearchRules({
  // A sharp mind (INT 16, PER 12: Lore 70) puts in about 15 points a day,
  // a plodder (INT 10, PER 10: Lore 50) about 7.
  intBase: 8,
  loreShare: 0.1,
  knowledgeBonus: 25,
  xpPerDay: 4,
  killPoints: 1,
  // A goblin (power 4) is Studied at 32 points and Mastered at 96; a cave
  // troll (power 12) at 96 and 288.
  perPower: [8, 24],
  // DECIDED F (DESIGN.md §17): +15% at Studied, +25% at Mastered.
  damage: [15, 25],
  masteredResist: 50,
});
