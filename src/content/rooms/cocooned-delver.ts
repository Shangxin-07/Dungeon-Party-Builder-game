import { defineRoom } from "../types";

// The Warrens: someone who came down before the guild, wrapped up for later.
export default defineRoom({
  id: "cocooned-delver",
  name: "Larder",
  behaviour: "treasure",
  floors: [2, 2],
  weight: 1,
  descriptions: [
    "A spider's larder. One of the bundles hanging here was a person.",
    "A cocoon the size of a man, hung from the roof. Its pack is still on.",
  ],
  loot: "cocoon-loot",
});
