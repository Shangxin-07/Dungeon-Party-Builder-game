import { defineRoom } from "../types";

// The Old Delve: crystal grows here as fast as moss, and it's worth more than the silver.
export default defineRoom({
  id: "crystal-grotto",
  name: "Crystal grotto",
  behaviour: "treasure",
  floors: [5, 5],
  weight: 1,
  descriptions: [
    "A grotto grown full of warm red crystal. It hums.",
    "The old gallery wall is split, and crystal has grown out of the crack like frost.",
  ],
  loot: "crystal-grotto",
});
