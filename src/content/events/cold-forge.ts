import { defineEvent } from "../types";

// The Ember Deeps: a Keepers' forge, the only cold thing on the floor. Shards
// half-mended on the anvil, and the tools laid down as if for a moment.
export default defineEvent({
  id: "cold-forge",
  name: "The cold forge",
  floors: [9, 9],
  weight: 2,
  intro:
    "In the middle of all the heat there's a forge, stone cold. On the anvil lie two pieces of something that glowed once, set edge to edge, and the tongs laid down beside them as if the smith meant to come straight back.",
  outcomes: {
    good: {
      text: "{hero} sets the tongs straight and leaves the pieces just as they are. Whoever was mending them may still want to finish. The party rests in the only cool air on the floor.",
      effects: [
        { type: "healParty", percent: 20, text: "The party rests by the cold forge" },
        { type: "deed", fact: "goodDeeds" },
      ],
    },
    neutral: {
      text: "{hero} looks a long while at the two pieces on the anvil, and the party goes on.",
      effects: [{ type: "healParty", percent: 8 }],
    },
    evil: {
      text: "{hero} sweeps the anvil clean into a sack: the pieces, the tongs, the good slag iron under the bench. Let the smith find their own.",
      effects: [
        { type: "loot", table: "cold-forge", from: "the forge" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
