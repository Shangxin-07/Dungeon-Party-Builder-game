import { defineTownsfolkRules } from "./types";

/**
 * Townsfolk (M7.15, DESIGN.md §18.1b, 2b). When no raid has got through for
 * a few days and there's housing and food, settlers drift in, one or two at
 * a time. Each eats a unit of food a day and pays a gold of tax; on market
 * days (every week, with a Market) they spend 2 more each. A raid that gets
 * through sends a quarter of them packing.
 */
export default defineTownsfolkRules({
  safeDays: 3,
  arrivalChance: 0.5,
  arrivalMax: 2,
  eats: 1,
  foodStore: 40,
  tax: 1,
  marketEvery: 7,
  marketDay: 2,
  fleeOnRaid: 0.25,
});
