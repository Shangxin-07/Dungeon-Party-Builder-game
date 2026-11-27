import { defineCoreRules } from "../types";

/**
 * The Coalstone's heart (M8.38, DESIGN.md §21): the end of Act Two's first
 * stretch. Mike, 2026-11-27: stilled like the Hearthstone's, with hints along
 * the way that a stone could be mended or bound (that choice waits for the
 * Emberstone). Every floor above the Coal Halls held, a party walks the halls,
 * follows the Keeper's echoes to the heart, and fights what the Coalstone made.
 */
export default defineCoreRules({
  id: "coalstone",
  stone: "Coalstone",
  floor: 7,
  guardian: "banked-fire",
  guide: "the Keeper's echoes",
  // The third rubbing says where the heart is, and that the echoes will show the way.
  revealedBy: "keepers-stair-sealed",
  escort: 0.5,
  walkHours: 2,
  shutHours: 6,
  text: {
    reach:
      "At the end of the last hall the Keeper's echoes are waiting, a line of them, holding up their lamps. They walk the party down, past the great hearths, to a round room with a ring cut in the floor. In the ring, cracked across, the Coalstone glows like a coal you could hold.",
    guardian:
      "The fire in the hearths leans towards the stone and stands up out of it, in the shape of someone tending it. The halls' own crew comes in behind, and there's no way out.",
    shut: "The echoes gather round the cracked stone. The party could make it whole, maybe, if they knew how; or put it to work, the way the town's smiths would. Instead they do what the echoes show them: bank it down under ash, slowly, until it sleeps. The halls cool. The echoes put out their lamps, one by one.",
    beaten:
      "The party can't get near the stone. The fire stands over it, and the echoes lower their lamps as the party falls back.",
    panel:
      "The Coalstone glows in the Keepers' own halls, cracked like the Hearthstone above it, and everything on the Keepers' Stair and in the Coal Halls came up out of it.",
  },
});
