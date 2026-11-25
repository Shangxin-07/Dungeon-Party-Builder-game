import { defineCoreRules } from "./types";

/**
 * The Hearthstone's core (M8.22, DESIGN.md §20): the end goal, and hard on
 * purpose (Mike, 2026-11-25). Only once every floor above the Old Delve is
 * held by a Seal Stone can a party go down to the heart. It walks the floor,
 * follows the Foreman's Shade to the face, and fights what the heart grew
 * last, with the Delve's own crew round it, cornered. Win, and the heart is
 * shut off for good: the bottom floor stops breeding and the dead lie still.
 */
export default defineCoreRules({
  floor: 5,
  guardian: "hearthborn",
  escort: 0.5,
  walkHours: 2,
  shutHours: 6,
  text: {
    reach:
      "The Foreman's Shade is waiting at the end of the last gallery. Without a word it turns and leads them down, past the face where the vein ends, to a cave that glows. In the middle of it, half in the rock, the heart of the Hearthstone beats.",
    guardian:
      "Something stands up out of the light. The heart has been growing it for a hundred years: the last thing it made, and the strongest. The Delve's crew come up behind it, and there's nowhere to go.",
    shut: "The Shade lays a hand on the crack where the pick went in, a hundred years ago. The party works until the light runs out of it. The beat slows, and stops, and the Old Delve goes quiet.",
    beaten:
      "The party can't get near the heart. It beats on behind them as they fall back up the gallery.",
  },
});
