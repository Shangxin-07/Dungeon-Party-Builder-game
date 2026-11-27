import { defineEvent } from "../types";

// The Keepers' Stair: a little flame in a niche, still burning on nothing. Somebody kept it.
export default defineEvent({
  id: "tended-flame",
  name: "The tended flame",
  floors: [6, 6],
  weight: 2,
  intro:
    "In a niche on the stair a small flame burns on bare stone, with nothing to feed it. The niche is swept clean.",
  outcomes: {
    good: {
      text: "{hero} kneels and cups a hand round it, the way you'd shelter a candle. It burns a little brighter, and the party feels rested.",
      effects: [
        { type: "healParty", percent: 20, text: "Warmth goes through the party" },
        { type: "deed", fact: "goodDeeds" },
      ],
    },
    neutral: {
      text: "{hero} warms their hands at it for a moment, and they move on.",
      effects: [{ type: "healParty", percent: 8 }],
    },
    evil: {
      text: "{hero} prises out the stone it burns on. The flame goes out, and the stone stays warm in the pack.",
      effects: [
        { type: "loot", table: "tended-flame", from: "the niche" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
