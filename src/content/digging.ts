import { defineDigRules } from "./types";

/**
 * Dig sites (M8.20, DESIGN.md §20): a held floor has room for 1 site plus 1
 * for each floor deep (floor 1: 2, floor 3: 4). They work while the floor
 * holds no more than 60% of its capacity: Trickle keeps it stocked, and
 * someone has to keep hunting it.
 */
export default defineDigRules({
  slots: { base: 1, perFloor: 1 },
  quiet: 0.6,
});
