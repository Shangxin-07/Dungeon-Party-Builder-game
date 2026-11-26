import { defineEvent } from "../types";

// The Old Delve: a crystal that sings, and seems to want something.
export default defineEvent({
  id: "singing-crystal",
  name: "The singing crystal",
  floors: [5, 5],
  weight: 1,
  intro:
    "A great red crystal has grown up through the floor. It sings, low and warm, and the party feels it in their teeth.",
  outcomes: {
    good: {
      text: "{hero} wants none of the heart's gifts and smashes it. The song stops, and the floor feels a little colder.",
      effects: [
        { type: "deed", fact: "goodDeeds" },
        { type: "hurt", damage: [3, 6], damageType: "piercing", hits: "one" },
      ],
    },
    neutral: {
      text: "{hero} steers the party wide round it and doesn't listen.",
      effects: [],
    },
    evil: {
      text: "{hero} breaks off as much as they can carry, and the song follows them, warm and pleased.",
      effects: [
        { type: "loot", table: "crawler-loot", from: "the singing crystal" },
        { type: "loot", table: "crystal-grotto", from: "the singing crystal" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
