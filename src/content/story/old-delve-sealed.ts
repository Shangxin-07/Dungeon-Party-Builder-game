import { defineChapter } from "../types";

// Floor 5 sealed (M8.37, DESIGN.md §21): the first hint that a stone can be
// mended or bound, ahead of the Coalstone and the Emberstone.
export default defineChapter({
  id: "old-delve-sealed",
  order: 10,
  title: "Keep or use",
  when: { kind: "sealed", floor: 5 },
  news: "The stone on the stairs below the Old Delve took. Under it, the party found another rubbing's worth of the Keepers' marks, and the old smith has been staring at them all night.",
  page: `(A second rubbing, from the landing under the Old Delve. The old smith's notes are pinned to it.)

The same ring of marks as the top step, but there's more here, two lines cut side by side, one deep and careful, one scratched in after:

THE STONE THAT BREAKS CAN BE MADE WHOLE, BY THOSE WHO WOULD KEEP IT.

THE STONE THAT BREAKS CAN BE MADE TO SERVE, BY THOSE WHO WOULD USE IT.

The smith says the shards you've brought up this time aren't the Hearthstone's. They're older, and they run hotter. Whatever the Keepers kept down there is called the Coalstone in the marks, and it's cracked too.

(The note says: "They chose to keep. Somebody, later, wrote the other line.")`,
  reveal: {
    floor: 6,
    text: "Under the Hearthstone lies the Coalstone, the Keepers' own, cracked by the same blow. The Keepers wrote that a broken stone can be made whole by those who'd keep it, or made to serve by those who'd use it.",
  },
});
