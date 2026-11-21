import { defineEvent } from "../types";

// A monster that's had enough (DESIGN.md §7): Evil heroes like finishing off
// the ones that run.
export default defineEvent({
  id: "cornered-goblin",
  name: "A cornered goblin",
  floors: [1, 3],
  weight: 2,
  intro: "A goblin, alone and hurt, backs into a corner and drops its blade.",
  outcomes: {
    good: {
      text: "{hero} kicks the blade away and lets it run.",
      effects: [{ type: "deed", fact: "goodDeeds" }],
    },
    neutral: {
      text: "{hero} shouts it off into the dark and the party gets on with it.",
      effects: [],
    },
    evil: {
      text: "{hero} finishes it off, slowly, and goes through its pockets.",
      effects: [
        { type: "loot", table: "goblin-loot", from: "on the goblin" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
