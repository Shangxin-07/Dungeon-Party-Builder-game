import { defineChapter } from "../types";

// Act Two opens (M8.36, DESIGN.md §21): under the still heart, a stair nobody dug.
export default defineChapter({
  id: "the-stair-below",
  order: 9,
  title: "The stair below",
  when: { kind: "core", shut: true },
  news: "Under the still heart, the miners' floor has given way onto a stair. It isn't the miners' work. Someone has copied out what's cut into the top step.",
  page: `(Not the Foreman's hand. A rubbing, taken from the top step of the stair under the heart, with a note pinned to it.)

The marks go round the step in a ring. Nobody in town can read them. The old smith says they're not letters, they're a list: the same mark over and over, each a little smaller, going down.

Under them, cut deeper and newer, as if by someone in a hurry:

KEEP IT FED. KEEP IT WARM. KEEP IT DOWN.

The stair is warm to the touch. The lamps on it are lit, and nobody lit them.

(The note says: "Tamm never knew. The Hearthstone was the top of it, not the bottom.")`,
  reveal: {
    floor: 6,
    text: "The Keepers' Stair was built, not dug. Its wards still half work: they take the edge off fire, and they stiffen whatever stands on the stair. Stone wardens still keep it, and hounds that have lain too long by the heat.",
  },
});
