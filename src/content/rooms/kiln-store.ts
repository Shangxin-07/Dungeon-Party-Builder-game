import { defineRoom } from "../types";

// The Kiln: where the Keepers kept what they fired, shelf on shelf of it.
export default defineRoom({
  id: "kiln-store",
  name: "Kiln store",
  behaviour: "treasure",
  floors: [10, 10],
  weight: 2,
  descriptions: [
    "Brick shelves round a cool side-chamber, and on them things the Keepers fired: pots, tiles, glass.",
    "A store-room behind the kiln wall. Most of it is broken. Not all of it.",
  ],
  loot: "kiln-store",
});
