import { defineTimeRules } from "./types";

/**
 * The trip clock (M7.01, DESIGN.md §17.2). Every room, fight and flight of
 * stairs takes time; the party sleeps at the floor's rest spot, or camps in a
 * tunnel once it has been awake too long. Tuned so a floor takes about a day,
 * there and back, as trips did before the clock: `npm run balance` prints the
 * hours per floor. A trip's days in town come from these hours.
 */
export default defineTimeRules({
  startHour: 8,
  stairs: 1,
  cagePerFloor: 0.5,
  room: 1,
  behaviours: { trap: 0.5, treasure: 0.5, event: 0.5, rest: 8 },
  fight: { hours: 1, freeRounds: 8, perRound: 0.1 },
  cache: 1,
  hunt: 4,
  climbPerFloor: 2.5,
  awakeHours: 16,
  campHours: 8,
});
