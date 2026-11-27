import { defineEvent } from "../types";

// The Kiln: the Keepers' last camp, at the Kiln's door. Bedrolls, a cold pot,
// and the last of them still sitting there, as if waiting for someone.
export default defineEvent({
  id: "last-camp",
  name: "The last camp",
  floors: [10, 10],
  weight: 2,
  intro:
    "Just short of the heat there's a camp: bedrolls laid in a row, a pot gone cold, tools wrapped in oilcloth. The bedrolls aren't empty. Whoever came down last lay down here together, and didn't get up.",
  outcomes: {
    good: {
      text: "{hero} straightens the blankets and lays the tools beside their owners. Someone came after them, in the end. The party sits with them a while before going on.",
      effects: [
        { type: "healParty", percent: 25, text: "The party rests at the last camp" },
        { type: "deed", fact: "goodDeeds" },
      ],
    },
    neutral: {
      text: "{hero} looks at the row of bedrolls for a long moment, and the party goes quietly on.",
      effects: [{ type: "healParty", percent: 10 }],
    },
    evil: {
      text: "{hero} unwraps the oilcloth: good tools, fired glass, a few things worth a lot. The dead don't need them.",
      effects: [
        { type: "loot", table: "last-camp", from: "the camp" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
