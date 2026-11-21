import { defineEvent } from "../types";

// DESIGN.md §7's example: healed by a Good party (and thanked later), left
// by a Neutral one, robbed by an Evil one.
export default defineEvent({
  id: "wounded-stranger",
  name: "A wounded stranger",
  floors: [1, 5],
  weight: 3,
  intro: "A miner from another crew sits against the wall, bleeding, a purse at their belt.",
  outcomes: {
    good: {
      text: "{hero} binds the miner's wounds and walks them to the shaft.",
      effects: [
        { type: "deed", fact: "goodDeeds" },
        {
          type: "gift",
          chance: 0.6,
          gold: [15, 40],
          news: "The miner the party saved sent {gold} gold to say thanks.",
        },
      ],
    },
    neutral: {
      text: "{hero} leaves the miner some water and a candle. The party moves on.",
      effects: [],
    },
    evil: {
      text: "{hero} cuts the purse from the miner's belt and leaves them to it.",
      effects: [
        { type: "loot", table: "strangers-purse", from: "on the miner" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
