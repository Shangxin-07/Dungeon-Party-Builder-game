import { defineRoom } from "../types";

export default defineRoom({
  id: "quiet-passage",
  name: "Quiet passage",
  behaviour: "quiet",
  floors: [1, 10],
  weight: 1,
  descriptions: [
    "A long, empty tunnel. Old pick marks on the walls.",
    "Water drips somewhere in the dark. Nothing else stirs.",
    "An abandoned miners' camp, long since picked clean.",
  ],
});
