import { defineOpening } from "./types";

/**
 * The opening (DESIGN.md §8): the guild arrives at a mining camp that has just
 * dug too deep. No Guild Hall, no walls, and monsters already climbing out.
 * Hold the pit from posts (content/posts/), gather materials, build, and only
 * then start sending parties down.
 */
export default defineOpening({
  startingGold: 120,
  // Whatever the miners had to hand: whoever holds the pick-axe is the fighter.
  startingStash: [
    "pick-axe",
    "pick-axe",
    "sling",
    "staff",
    "work-leathers",
    "work-leathers",
    "bandages",
    "bandages",
    "bandages",
  ],
  unbuilt: ["guild-hall"],
  campRoster: 5,
  unlock: { "guild-hall": 1, palisade: 1 },
  // Once the road is safe, the guild's own wagons get through: proper kit
  // for the first parties to go down.
  heldStash: [
    "sword",
    "short-bow",
    "mace",
    "chainmail",
    "leather-armor",
    "leather-armor",
    "wooden-shield",
    "healing-potion",
    "healing-potion",
    "healing-potion",
  ],
});
