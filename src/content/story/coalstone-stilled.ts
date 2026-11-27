import { defineChapter } from "../types";

// The Coalstone banked down (M8.38): the way to the Emberstone waits for a later PR.
export default defineChapter({
  id: "coalstone-stilled",
  order: 13,
  title: "Banked",
  when: { kind: "core", heart: "coalstone", shut: true },
  news: "The Coalstone sleeps, banked under its ash. The Coal Halls are cooling. In the round room where it lay, the floor has a second ring cut in it, smaller, and a stair goes down through the middle, blocked with fallen stone.",
  page: `(A last slate, found under the Coalstone when the ash had settled.)

WE WENT DOWN.

THE ONE BELOW IS OLDER THAN US. OLDER THAN ANYONE. IT IS WHERE THE FIRE STARTED, AND IT IS CRACKED WORST OF ALL.

IF YOU COME AFTER US, BRING WHAT YOU HAVE LEARNED. A STONE THAT BREAKS CAN BE MADE WHOLE, BY THOSE WHO WOULD KEEP IT. OR MADE TO SERVE, BY THOSE WHO WOULD USE IT.

WE NEVER DECIDED. YOU WILL HAVE TO.

(The smith's note: "Emberstone, they call it. The stair's blocked. It'll take some clearing.")`,
});
