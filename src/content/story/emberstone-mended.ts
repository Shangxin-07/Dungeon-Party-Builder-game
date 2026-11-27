import { defineChapter } from "../types";

// The Emberstone mended (M8.41, DESIGN.md §21): the morale road's ending.
export default defineChapter({
  id: "emberstone-mended",
  order: 19,
  title: "Whole",
  when: { kind: "way", heart: "emberstone", way: "mended" },
  news: "The Emberstone is whole, and the whole pit sleeps. People are going down the first stairs just to look, now they can.",
  page: `(The old smith's own page, the last in the book.)

They mended it. I went down with them as far as the Kiln, which I never thought I'd see, old as I am.

The priests laid the halves together and put everything we'd learned around them: the Foreman's pages, the Keepers' slates, the ash from the stilled hearts. They sang. The crack closed like a healing cut.

Then it went dark, and cool, and quiet. Not dead. Asleep.

On the way back up there was nothing on any floor. The tunnels just stood there, empty, like a house after the guests have gone.

The Keepers never decided. We did.`,
});
