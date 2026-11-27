import { defineChapter } from "../types";

// The ending (M8.22): the heart is shut off for good.
export default defineChapter({
  id: "the-heart-stilled",
  order: 8,
  title: "End of shift",
  when: { kind: "core", shut: true },
  news: "The heart of the Hearthstone is still. The Hearthstone breeds no more, and its dead will lie where they fall. The Foreman left one last page.",
  page: `It's stopped. I felt it go.

A hundred years I've stood at that face, and tonight it's only rock. The crew are lying down. I can hear them, all along the gallery, one after another, like the end of a long shift.

What the Hearthstone made is all it'll ever make. Hunt it out or leave it be: it won't grow back. The town is yours now. It always was; I only dug the hole.

Put my name in the day book with the rest of the crew. Then close it.

Tamm, foreman. Off shift.`,
});
