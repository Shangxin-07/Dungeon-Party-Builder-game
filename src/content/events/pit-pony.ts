import { defineEvent } from "../types";

// The Diggings: one of the miners' pit ponies, still down here after all these years.
export default defineEvent({
  id: "pit-pony",
  name: "The pit pony",
  floors: [1, 1],
  weight: 1,
  intro:
    "A pit pony, grey to the muzzle and half wild, stands blinking in a side tunnel. It still wears its harness.",
  outcomes: {
    good: {
      text: "{hero} talks it round with a heel of bread and sends it trotting up towards the light.",
      effects: [{ type: "deed", fact: "goodDeeds" }],
    },
    neutral: {
      text: "{hero} cuts the harness off it so it won't snag, and leaves it be.",
      effects: [{ type: "loot", table: "pony-tack", from: "off its harness" }],
    },
    evil: {
      text: "{hero} has the brass off its harness and drives it off down the tunnel, towards whatever's hungry.",
      effects: [
        { type: "loot", table: "pony-tack", from: "off its harness" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
