import { defineEvent } from "../types";

// The Coal Halls: a great hearth, banked for the night a very long time ago,
// still red under the ash. A small taste of the choice at the end of Act Two:
// keep it, or use it.
export default defineEvent({
  id: "banked-hearth",
  name: "The banked hearth",
  floors: [7, 7],
  weight: 2,
  intro:
    "A hearth as wide as a cottage, banked down under a heap of grey ash. Under the ash the coals are still red. A rake leans against it, worn smooth by hands.",
  outcomes: {
    good: {
      text: "{hero} takes the rake and banks the coals again, carefully, the way someone always did here. The warmth that comes off it feels like being thanked.",
      effects: [
        { type: "healParty", percent: 20, text: "The party rests by the hearth" },
        { type: "deed", fact: "goodDeeds" },
      ],
    },
    neutral: {
      text: "{hero} warms the party's hands at it, and leaves it as it was.",
      effects: [{ type: "healParty", percent: 8 }],
    },
    evil: {
      text: "{hero} rakes out the best coals into a pot. They'll fetch a price up top. The hearth sinks to grey behind them.",
      effects: [
        { type: "loot", table: "banked-hearth", from: "the hearth" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
