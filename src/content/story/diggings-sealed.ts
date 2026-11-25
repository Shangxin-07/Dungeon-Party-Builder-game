import { defineChapter } from "../types";

// Floor 1 sealed (M8.21): the Warrens below.
export default defineChapter({
  id: "diggings-sealed",
  order: 3,
  title: "What the spiders became",
  when: { kind: "sealed", floor: 1 },
  news: "With the stairs under the Diggings held, a page turned up on the stone itself, weighted with a pebble. The Foreman writes about the Warrens.",
  page: `We sent a party down to the Warrens for the lower shift. They came back four of nine.

The spiders were always there, little things in the props. Now they're the size of dogs, and there's one at the back the size of the cookhouse, swollen round something that glows in her. The men say she was a little thing too, a hundred years ago, and she should have died of age before any of us were born.

The stone won't let things finish. That's what it does now. It keeps everything going.

I've told the camp we'll seal the Warrens and dig round. I've told the camp a lot of things.`,
  reveal: {
    floor: 2,
    text: "The Brood Queen was an ordinary spider once. The shard in her has kept her alive and growing for a hundred years.",
  },
});
