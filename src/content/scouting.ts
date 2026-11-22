import { defineScoutRules } from "./types";

/**
 * Scout missions (M7.08, DESIGN.md §17.8). A scout party slips past fights
 * where its best scout can: a typical scout (Scouting ~70) gets past about
 * half of them. What it saw comes home as floor intel, good for ten days.
 */
export default defineScoutRules({
  slipBase: -20,
  slipMax: 0.8,
  staleDays: 10,
  roundTo: 5,
});
