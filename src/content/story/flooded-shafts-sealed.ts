import { defineChapter } from "../types";

// Floor 4 sealed (M8.21): the Old Delve, the bottom, and the core.
export default defineChapter({
  id: "flooded-shafts-sealed",
  order: 6,
  title: "Still at the face",
  when: { kind: "sealed", floor: 4 },
  news: "One last page lies on the held stairs above the Old Delve, in a hand that shakes. The Foreman is waiting at the bottom.",
  page: `You've come further than my crew did. Further than I'd have sent them.

I'm still at the face, in the Old Delve where the vein ends. What's left of the Hearthstone is here, the heart of it, and it beats. Everything you've fought came up out of it. Everything that'll ever come up will.

I can't put it right. I've tried every night for a hundred years. The light keeps me, the way it keeps the rest of them, and it won't let me finish.

Bring the last of it down, all you've taken from the floors, and I'll show you where I struck. Then you can choose what I couldn't: shut it, or leave it beating.

Tamm, foreman. Still on shift.`,
  reveal: {
    floor: 5,
    text: "The heart of the Hearthstone lies in the Old Delve, and the Foreman's Shade keeps the face beside it. He says he'll show the way to whoever brings the last of the shards down.",
  },
});
