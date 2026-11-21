import { defineSearchRules } from "./types";

/**
 * Hidden treasure (M6). About one room in seven hides a cache. A typical
 * scout (Scouting ~70) finds about half the caches on floor 1 and fewer
 * deeper down; a party without one finds almost none. Tune freely.
 */
export default defineSearchRules({
  chancePerRoom: 0.15,
  spread: 40,
  maxChance: 0.9,
});
