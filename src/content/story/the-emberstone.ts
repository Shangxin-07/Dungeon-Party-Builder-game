import { defineChapter } from "../types";

// A party reaches the Emberstone's heart (M8.41), whether or not it wins.
export default defineChapter({
  id: "the-emberstone",
  order: 17,
  title: "What stands in the fire",
  when: { kind: "core", heart: "emberstone", shut: false },
  news: "A party has been to the middle of the Kiln and seen the Emberstone, and what holds it. They came back very quiet.",
  page: `(No slate this time. The party's own words, written down by the old smith the night they came back.)

It's in two halves, the stone. Big as a cart. Glowing white along the crack, like it's trying to close and can't.

And there's someone holding it. Not someone. Something the shape of someone, all fire, kneeling, with a hand on each half, pressing them together.

It didn't want to fight us. It just wouldn't let go.

(The smith's note: "'If something stands in the fire, it was one of us.' I think the last Keeper never left.")`,
  reveal: {
    floor: 10,
    text: "The Tender stands over the Emberstone: the stone's fire in a tending shape, holding the halves together. It burns the whole party in waves, and the stone feeds it when it's badly hurt. Cold and holy light hurt it; the Kiln's own things fight beside it.",
  },
});
