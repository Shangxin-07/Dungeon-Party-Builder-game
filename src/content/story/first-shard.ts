import { defineChapter } from "../types";

// The first shard of the Hearthstone comes home (M8.21).
export default defineChapter({
  id: "first-shard",
  order: 2,
  title: "The blow",
  when: { kind: "shards", count: 1 },
  news: "The night after the first shard came home, another page of the Foreman's day-book was on the guild's step. Whoever leaves them knows what the guild found.",
  page: `I struck it myself. The men wouldn't.

One blow with the long pick, at the seam where the silver goes in. It rang like a bell and split down the middle, and the light came out of it. Not fire. Light like warm milk, pouring up the shaft faster than a man runs. Pieces of it went with the light, up through every floor we'd dug.

Everything it touched woke up. Lichen grew while I watched. The rats under the sleepers got big. Wenn's knee is fine.

That was the morning. By night the men on the lower shift had stopped answering the bell.`,
});
