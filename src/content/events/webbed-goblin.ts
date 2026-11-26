import { defineEvent } from "../types";

// The Warrens: a goblin caught in a web, the spider not yet home.
export default defineEvent({
  id: "webbed-goblin",
  name: "A goblin in a web",
  floors: [2, 2],
  weight: 1,
  intro: "A goblin hangs in a web across the burrow, squealing. Whatever spun it isn't home yet.",
  outcomes: {
    good: {
      text: "{hero} cuts it down. It runs off without a word, but it leaves a little something behind.",
      effects: [
        { type: "deed", fact: "goodDeeds" },
        { type: "loot", table: "goblin-loot", from: "where the goblin hung" },
      ],
    },
    neutral: {
      text: "{hero} edges the party round the web and leaves the goblin to its luck.",
      effects: [],
    },
    evil: {
      text: "{hero} goes through its pockets while it hangs there, and leaves it for the spider.",
      effects: [
        { type: "loot", table: "goblin-loot", from: "off the goblin" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
