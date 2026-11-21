import { defineEvent } from "../types";

// A holy place (DESIGN.md §7): a Good party prays and is healed, an Evil one
// takes the offerings and gets burned for it.
export default defineEvent({
  id: "miners-shrine",
  name: "The miners' shrine",
  floors: [2, 5],
  weight: 2,
  intro: "Candles still burn at a little shrine the old miners cut into the rock.",
  outcomes: {
    good: {
      text: "{hero} kneels, and the party prays with them. Something warm fills the tunnel.",
      effects: [
        { type: "healParty", percent: 30 },
        { type: "deed", fact: "goodDeeds" },
        { type: "loot", chance: 0.2, table: "shrine-relic", from: "at the shrine" },
      ],
    },
    neutral: {
      text: "The party sits by the candles for a while before going on.",
      effects: [{ type: "healParty", percent: 10 }],
    },
    evil: {
      text: "{hero} sweeps the offerings into a sack and kicks the candles over.",
      effects: [
        { type: "loot", table: "shrine-offerings", from: "at the shrine" },
        { type: "deed", fact: "evilDeeds" },
        {
          type: "hurt",
          chance: 0.5,
          damage: [3, 6],
          damageType: "holy",
          hits: "all",
          text: "Holy fire flares up from the shrine",
        },
      ],
    },
  },
});
