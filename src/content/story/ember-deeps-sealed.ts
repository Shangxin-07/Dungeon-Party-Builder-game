import { defineChapter } from "../types";

// Floor 9 sealed (M8.41, DESIGN.md §21): where the Emberstone is, and the way to it.
export default defineChapter({
  id: "ember-deeps-sealed",
  order: 16,
  title: "The Kiln door",
  when: { kind: "sealed", floor: 9 },
  news: "The stone on the stairs below the Ember Deeps took. The party that set it found the Kiln's door standing open below, and footprints in the soot going in. None coming out.",
  page: `(Scratched into the Kiln's door-post with a nail, in the same hand as the cold forge.)

WE ARE GOING IN TO HOLD IT TOGETHER.

NOT TO MEND IT. WE CANNOT, NOT WITHOUT THE PIECES. NOT TO BIND IT. WE WOULD NOT AGREE. ONLY TO HOLD IT, SO IT HURTS LESS, UNTIL SOMEONE COMES WHO CAN DECIDE.

FOLLOW OUR TRACKS. THEY GO TO THE MIDDLE.

IF SOMETHING STANDS IN THE FIRE, IT WAS ONE OF US.

(The smith's note: "Every floor held now, all the way down. Whoever goes in there, it's ours to decide when they come back.")`,
  reveal: {
    floor: 10,
    text: "The Emberstone lies at the middle of the Kiln, where the Keepers' tracks in the soot lead. Every floor above it held, a party can follow them in.",
  },
});
