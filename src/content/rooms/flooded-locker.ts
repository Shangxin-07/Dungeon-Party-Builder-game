import { defineRoom } from "../types";

// The Flooded Shafts: the miners' lockers, under the water line.
export default defineRoom({
  id: "flooded-locker",
  name: "Drowned lockers",
  behaviour: "treasure",
  floors: [4, 4],
  weight: 1,
  descriptions: [
    "A row of miners' lockers, half under water. Some are still shut.",
    "A changing room, flooded to the benches.",
  ],
  loot: "flooded-locker",
});
