import { defineClass } from "../types";

/**
 * The opening (DESIGN.md §8): everyone at the mining camp is a miner, holding
 * the pit with picks and work clothes. Nobody can be recruited into it or
 * take it at a level-up. Once the camp is held, each miner picks the class
 * they'll delve as (trainMiner), and their levels move over with them.
 */
export default defineClass({
  id: "miner",
  name: "Miner",
  kind: "camp",
  blurb: "Dug too deep. Holds the pit with a pick-axe until the guild can train them properly.",
  mainStats: ["STR", "END"],
  baseStats: { STR: 10, DEX: 10, END: 10, PER: 10, INT: 10, WIL: 10, CHA: 10 },
  likes: ["makeshift"],
  row: "front",
  ai: "fighter",
  abilities: {},
  startingKit: ["pick-axe", "work-leathers"],
  growth: { END: 1 },
});
