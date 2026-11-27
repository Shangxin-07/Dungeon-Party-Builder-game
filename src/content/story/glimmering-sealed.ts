import { defineChapter } from "../types";

// Floor 8 sealed (M8.40, DESIGN.md §21): the Ember Deeps held back, and a last
// slate about what the Keepers found at the bottom.
export default defineChapter({
  id: "glimmering-sealed",
  order: 15,
  title: "The cold forge",
  when: { kind: "sealed", floor: 8 },
  news: "The stone on the stairs below the Glimmering took. The party that set it brought back a slate they found wedged in the door of a cold forge in the Ember Deeps, and they say the forge was the only cool place on the floor.",
  page: `(A slate from the door of a forge in the Ember Deeps, in a different hand from the others.)

WE TRIED.

WE BROUGHT DOWN THE PIECES THAT CAME UP THE STAIR AND SET THEM EDGE TO EDGE AND THEY WOULD NOT TAKE. NOT WITHOUT THE REST. NOT WITHOUT IT LYING STILL.

SOME OF US SAID: MAKE IT SERVE INSTEAD. A STONE THAT WORKS DOES NOT NEED TO BE WHOLE. IT ONLY NEEDS A HAND ON IT.

WE ARGUED. THE FORGE WENT COLD WHILE WE ARGUED.

THE KILN IS BELOW. IT IS IN THE KILN. WHOEVER IS LEFT IS GOING DOWN TO IT.

(The smith's note: "They had the tongs in their hands, and they couldn't agree. I keep thinking about that.")`,
  reveal: {
    floor: 9,
    text: "The Keepers tried to mend the Emberstone's shards at a forge in the Ember Deeps, and argued over whether to make it serve instead. It lies below, in the Kiln.",
  },
});
