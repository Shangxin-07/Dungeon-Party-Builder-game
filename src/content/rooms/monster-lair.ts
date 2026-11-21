import { defineRoom } from "../types";

// A fight. The monsters come from the encounter tables for this floor.
export default defineRoom({
  id: "monster-lair",
  name: "Occupied chamber",
  behaviour: "fight",
  floors: [1, 5],
  // 7 since M6.23, so event rooms (strange-meeting) don't thin out the fighting.
  weight: 7,
  descriptions: [
    "Something is moving in the next chamber.",
    "Bones crunch underfoot. This room is lived in.",
    "Eyes glint in the torchlight.",
    "A foul smell, and the sound of something feeding.",
  ],
});
