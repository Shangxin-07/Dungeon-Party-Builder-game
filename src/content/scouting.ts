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
  // M7.13 fog: a floor under 40% full is quiet; at capacity it pushes its
  // extras up (floor 1: out of the pit). Word from below lasts three weeks.
  fog: {
    bands: [
      { below: 0.4, name: "quiet" },
      { below: 0.75, name: "busy" },
      { below: 1, name: "crowded" },
      { below: 99, name: "full" },
    ],
    fadeDays: 21,
  },
});
