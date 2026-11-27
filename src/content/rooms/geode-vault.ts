import { defineRoom } from "../types";

// The Glimmering: a hollow in the rock lined with crystal, and things that fell into it.
export default defineRoom({
  id: "geode-vault",
  name: "Geode vault",
  behaviour: "treasure",
  floors: [8, 8],
  weight: 2,
  descriptions: [
    "A round hollow lined with crystal points, like the inside of a split stone the size of a room.",
    "A crack opens into a cave of purple and white crystal. Things lie at the bottom, half grown over.",
  ],
  loot: "geode-vault",
});
