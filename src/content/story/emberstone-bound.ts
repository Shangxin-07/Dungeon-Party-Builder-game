import { defineChapter } from "../types";

// The Emberstone bound (M8.41, DESIGN.md §21): the profit road's ending.
export default defineChapter({
  id: "emberstone-bound",
  order: 20,
  title: "Bound",
  when: { kind: "way", heart: "emberstone", way: "bound" },
  news: "The Emberstone is bound and working for the guild. The forges in town have never burned so hot, and nothing has dared come near the walls since.",
  page: `(The old smith's own page, the last in the book.)

They bound it. Iron and deep silver round the two halves, still burning, the way you'd hoop a barrel. The Black Market's people know their work.

You can feel it up here. The forges draw better. The heroes come back stronger. The haul sells for more than it's worth.

And at night, if you put your ear to the stones of the pit wall, you can hear it down there. Working. It never stops.

The Keepers said it would never sleep again. They were right. I don't sleep so well either.

The Keepers never decided. We did.`,
});
