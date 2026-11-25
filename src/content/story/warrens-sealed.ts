import { defineChapter } from "../types";

// Floor 2 sealed (M8.21): the Bone Halls below.
export default defineChapter({
  id: "warrens-sealed",
  order: 4,
  title: "The lower shift",
  when: { kind: "sealed", floor: 2 },
  news: "A new page of the Foreman's, found folded on the held stairs under the Warrens. It's about the Bone Halls, and the men who worked them.",
  page: `We buried the lower shift in the Halls, where we'd cut the big gallery. Eleven of them. Wenn said the words.

On the third night the bell rang down there, and the shift came up the ladder to answer it, the way they always did. Wenn's boy among them. They had their picks.

The stone won't let the dead lie either. I should have known that from the spiders.

We've walled the Halls. They're still at work down there, cutting at nothing, lining up for a bell that I can't stop ringing. One of them has a shard in his chest and wears it like a captain's badge.`,
  reveal: {
    floor: 3,
    text: "The Ossuary Knight was one of the lower shift. The shard in his chest keeps him on his feet, and keeps the rest of the dead in step behind him.",
  },
});
