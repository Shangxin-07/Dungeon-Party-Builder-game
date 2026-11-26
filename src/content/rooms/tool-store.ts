import { defineRoom } from "../types";

// The Diggings: where the miners kept their tools. The goblins haven't had all of it.
export default defineRoom({
  id: "tool-store",
  name: "Tool store",
  behaviour: "treasure",
  floors: [1, 1],
  weight: 1,
  descriptions: [
    "A tool store cut into the rock, its door off its hinges.",
    "Racks of rusted picks and a lamp-hook for every miner who never came back for theirs.",
  ],
  loot: "miners-tools",
});
