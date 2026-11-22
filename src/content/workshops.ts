import { defineWorkshopRules } from "./types";

/**
 * Work at the benches (M7.14, DESIGN.md §18.1). An average hero (stat 10)
 * puts in a day's work a day; STR 16 at the forge gets through 1.6. A porter
 * works at half pace. A day at a bench is half a day's rest.
 */
export default defineWorkshopRules({
  perDay: 1,
  perStat: 0.1,
  minDay: 0.5,
  porter: 0.5,
  rest: 0.5,
  queue: 6,
  // M7.15: a townsperson at a bench, slower than most heroes but never tired.
  settler: 0.6,
});
