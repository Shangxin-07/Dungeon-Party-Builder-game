import { defineChapter } from "../types";

// The prologue (M8.21, DESIGN.md §20): the moment the guild starts delving.
export default defineChapter({
  id: "the-day-book",
  order: 1,
  title: "The day-book",
  when: { kind: "start" },
  news: "Someone left a page on the guild's step in the night: torn from the old mine foreman's day-book, the ink still wet. It's in the Foreman's pages, on the Pit tab.",
  page: `Number Four shaft, the last week of the dig. Tamm, foreman, writing.

The silver vein turned down again this morning, and the men want to leave it. I don't. Deep-silver this clean pays the camp's winter twice over, and I've followed worse veins further.

There is a stone at the bottom of it. Not ore. Smooth, the size of a cart, warm as a hearth with the fire just out. Put your hand on it and your aches go. Old Wenn says his knee hasn't hurt since Tuesday. The men call it the Hearthstone and leave their lunch on it to keep it warm.

The vein runs straight into it. I mean to have it out.`,
});
