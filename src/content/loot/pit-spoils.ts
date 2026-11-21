import { defineLootTable } from "../types";

// What's left on a raider killed at the pit (DESIGN.md §8): materials, never
// gold, so fighting off raids alone doesn't pay the wages.
export default defineLootTable({
  id: "pit-spoils",
  rolls: [1, 1],
  entries: [
    { item: null, weight: 6 },
    { item: "timber", weight: 3 },
    { item: "iron-ore", weight: 1 },
  ],
});
