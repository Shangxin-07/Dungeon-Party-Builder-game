import { defineChapter } from "../types";

// The Emberstone still (M8.41): the choice is the guild's now.
export default defineChapter({
  id: "emberstone-stilled",
  order: 18,
  title: "Yours to decide",
  when: { kind: "core", heart: "emberstone", shut: true },
  news: "The Emberstone is still. The thing that held it has gone back into it, and its two halves lie quiet in the Kiln. Everyone in town knows what comes next: mend it, or bind it.",
  page: `(The last of the Keepers' slates, found where the Tender knelt, under the stone.)

YOU CAME.

WE HELD IT AS LONG AS WE COULD. WE COULD NOT DECIDE, AND SO WE HELD IT, AND THE HOLDING TURNED US INTO THE FIRE.

THE PIECES ARE ALL UP THERE NOW, IN YOUR STONES. YOU KNOW WHAT WE KNEW.

WHOLE, IT SLEEPS, AND ALL THE STONES ABOVE IT SLEEP, AND NOTHING COMES UP THE STAIRS AGAIN.

BOUND, IT WORKS, AND YOU WILL BE RICH AND STRONG, AND IT WILL NEVER SLEEP.

DECIDE. DO NOT LEAVE IT HELD.

(The smith's note: "The Temple says mend it. The Black Market says bind it. The guild has to choose.")`,
});
