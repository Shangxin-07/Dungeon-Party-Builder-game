import { defineChapter } from "../types";

// Floor 6 sealed (M8.38, DESIGN.md §21): where the Coalstone is, and who'll show the way.
export default defineChapter({
  id: "keepers-stair-sealed",
  order: 11,
  title: "Where we kept it",
  when: { kind: "sealed", floor: 6 },
  news: "The stone on the stairs below the Keepers' Stair took. The echoes on the stair have stopped wandering: they stand at the top of the Coal Halls now, lamps up, as if they're waiting for someone.",
  page: `(A third rubbing, from the foot of the Keepers' Stair. The old smith has run out of pins and used nails.)

The ring of marks again, and under it, cut deep and careful, the longest writing yet:

HERE WE KEPT IT. WE FED IT AND KEPT IT WARM AND KEPT IT DOWN, AND IT SLEPT, AND THE LITTLE STONE ABOVE KEPT THE REST.

WHEN IT CRACKED WE COULD HAVE MADE IT WHOLE. WE KNEW HOW, ONCE. WE COULD HAVE MADE IT SERVE. SOME OF US WANTED TO.

WE BANKED IT INSTEAD, AND WENT DOWN TO SEE TO THE ONE BELOW.

The smith's note: "'The one below.' There's another. And they never came back up to finish."`,
  reveal: {
    floor: 7,
    text: "The Coalstone lies at the bottom of the Coal Halls, cracked like the Hearthstone. The Keeper's echoes wait at the top of the halls to lead a party down to it, now every floor above is held.",
  },
});
