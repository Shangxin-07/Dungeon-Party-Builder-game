import { defineChapter } from "../types";

// Floor 7 sealed (M8.39, DESIGN.md §21): the Glimmering held back, and a hint of the Keepers who went down.
export default defineChapter({
  id: "coal-halls-sealed",
  order: 14,
  title: "Grown over",
  when: { kind: "sealed", floor: 7 },
  news: "The stone on the stairs below the Coal Halls took. The party that set it brought back a lamp they found on the top step of the Glimmering, still lit, and a scrap of slate tied to it.",
  page: `(A slate tied to a Keeper's lamp with a bit of wire, found at the top of the Glimmering.)

THE CRYSTAL KEEPS WHAT STOPS IN IT.

WE WENT SLOW, AND SOME OF US SAT DOWN TO REST, AND THE CRYSTAL KEPT THEM. DO NOT SIT DOWN.

THE ONE BELOW IS PAST THE LIGHT AND PAST THE ASH. WE CAN FEEL IT FROM HERE. IT IS NOT ANGRY. IT IS BROKEN, AND IT DOES NOT KNOW WHAT ELSE TO DO BUT BURN.

WHOLE, IT WOULD SLEEP. BOUND, IT WOULD WORK. EITHER WAY IT WOULD STOP HURTING.

(The smith's note: "Not angry. Broken. I didn't think a stone could be either.")`,
  reveal: {
    floor: 8,
    text: "Some of the Keepers who went down sat to rest in the Glimmering, and the crystal grew over them. Beyond it lie the Ember Deeps, and the Emberstone past them.",
  },
});
