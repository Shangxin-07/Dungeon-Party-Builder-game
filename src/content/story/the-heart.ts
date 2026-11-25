import { defineChapter } from "../types";

// A party reaches the heart (M8.22), whether or not it wins: now the guild knows what guards it.
export default defineChapter({
  id: "the-heart",
  order: 7,
  title: "Where I struck",
  when: { kind: "core", shut: false },
  news: "A party has been down to the heart of the Hearthstone, and seen what guards it. The Foreman left another page by the pit.",
  page: `You've seen it now. The heart, and the thing standing over it.

That's where I struck. You can still see the mark. A good blow, the best of my life, and the last.

The heart grew that thing to keep us off. It's had a hundred years at it, and it's had all the life it wanted. Don't send me children. Send the best you've got, as many as you can feed, and send them rested.

I'll be at the face. I'm always at the face.

Tamm, foreman.`,
  reveal: {
    floor: 5,
    text: "The Hearthborn stands over the heart: huge, hard to hurt, and the heart closes its wounds when they're bad. Its crew fight with it, and there's no way past.",
  },
});
