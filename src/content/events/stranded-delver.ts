import { defineEvent } from "../types";

// The Flooded Shafts: someone else's delver, cut off on a ledge, with the water coming up.
export default defineEvent({
  id: "stranded-delver",
  name: "Stranded on a ledge",
  floors: [4, 4],
  weight: 1,
  intro:
    "A delver from some other crew is stuck on a ledge across a flooded gallery, and the water is rising.",
  outcomes: {
    good: {
      text: "{hero} wades across, freezing, and hauls the stranger back. They swear their crew will remember it.",
      effects: [
        { type: "deed", fact: "goodDeeds" },
        { type: "hurt", damage: [3, 6], damageType: "cold", hits: "one" },
        {
          type: "gift",
          gold: [30, 60],
          news: "A delver the guild pulled out of the Flooded Shafts sends {gold} gold with their thanks.",
        },
      ],
    },
    neutral: {
      text: "{hero} throws a line across and leaves the stranger to climb it.",
      effects: [],
    },
    evil: {
      text: "{hero} makes the stranger throw their pack across first, then walks off with it.",
      effects: [
        { type: "loot", table: "flooded-locker", from: "the stranger's pack" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
