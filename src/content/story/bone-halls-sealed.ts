import { defineChapter } from "../types";

// Floor 3 sealed (M8.21): the Flooded Shafts below.
export default defineChapter({
  id: "bone-halls-sealed",
  order: 5,
  title: "The pumps",
  when: { kind: "sealed", floor: 3 },
  news: "The Foreman's next page was nailed to the guild's door, the nail still warm. It tells of the Flooded Shafts, and of what he did there.",
  page: `I kept them digging. I want that written down by my own hand, so nobody says otherwise.

The silver went on below the Halls, and the stone's light kept the pumps turning on their own, so I put the last of the crew on the deep face. Then the pumps turned faster than any man had set them, and the water came up from below warm as a bath, and it didn't stop.

There is something huge asleep in that water now. The light found it first. And the drowned kneel round a thing that glows, as if it were a saint.

I didn't go up. A foreman doesn't leave the face while the shift's still down.`,
  reveal: {
    floor: 4,
    text: "Two shards lie in the Flooded Shafts: one in the Old Drowner sleeping under the warm water, one worn by the Hollow Saint the drowned kneel to.",
  },
});
