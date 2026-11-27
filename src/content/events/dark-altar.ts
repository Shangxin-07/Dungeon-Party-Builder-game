import { defineEvent } from "../types";

// An unholy place (DESIGN.md §7): it gives dark gifts to those who feed it.
export default defineEvent({
  id: "dark-altar",
  name: "A dark altar",
  floors: [3, 10],
  weight: 2,
  intro: "A slab of black stone, sticky with old blood. Something on it is waiting to be fed.",
  outcomes: {
    good: {
      text: "{hero} takes a hammer to the altar until it cracks in two.",
      effects: [{ type: "deed", fact: "goodDeeds" }],
    },
    neutral: {
      text: "Nobody wants anything to do with it. The party gives it a wide berth.",
      effects: [],
    },
    evil: {
      text: "{hero} cuts a palm and lets the blood run onto the stone. Something is left in exchange.",
      effects: [
        { type: "hurt", damage: [2, 4], damageType: "slashing", hits: "one" },
        { type: "loot", table: "altar-gifts", from: "on the altar" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
