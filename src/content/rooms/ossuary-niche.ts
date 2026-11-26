import { defineRoom } from "../types";

// The Bone Halls: a family's niche, still with what they were buried with.
export default defineRoom({
  id: "ossuary-niche",
  name: "Family niche",
  behaviour: "treasure",
  floors: [3, 3],
  weight: 1,
  descriptions: [
    "A family's niche, its name worn off the stone. The grave goods are still there.",
    "A sealed niche, cracked open from the inside.",
  ],
  loot: "grave-goods",
});
