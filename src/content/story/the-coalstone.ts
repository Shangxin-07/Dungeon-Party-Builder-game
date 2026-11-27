import { defineChapter } from "../types";

// A party reaches the Coalstone's heart (M8.38), whether or not it wins.
export default defineChapter({
  id: "the-coalstone",
  order: 12,
  title: "The fire that stands",
  when: { kind: "core", heart: "coalstone", shut: false },
  news: "A party has been down to the Coalstone, and seen what stands over it. One of the echoes followed them back up as far as the stair, and left something on the top step.",
  page: `(Not a rubbing this time. A slate, very old, left on the top step of the Keepers' Stair. The marks are scratched, not cut: somebody wrote it in a hurry.)

IT STANDS WHERE WE STOOD. IT LEARNED THE SHAPE OF US, TENDING.

DO NOT HATE IT. IT IS ONLY DOING WHAT WE DID.

BANK IT AND IT SLEEPS. MEND IT AND IT WAKES WHOLE. BIND IT AND IT WORKS FOR YOU, AND NEVER SLEEPS AGAIN.

WE BANKED IT. WE WERE TIRED.`,
  reveal: {
    floor: 7,
    text: "The Banked Fire stands over the Coalstone: a fire in the shape of a Keeper, fed by the stone whenever it's badly hurt. Fire is nothing to it; cold hurts it. The halls' crew fight with it, and there's no way past.",
  },
});
