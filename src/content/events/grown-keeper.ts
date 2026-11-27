import { defineEvent } from "../types";

// The Glimmering: one of the Keepers who went down, grown into the crystal where
// they sat to rest. Still holding a lamp.
export default defineEvent({
  id: "grown-keeper",
  name: "The grown-over Keeper",
  floors: [8, 8],
  weight: 2,
  intro:
    "Someone sits against the wall, grown over with crystal like frost on a window, a lamp still in their lap. They must have sat down to rest and never got up. The crystal has kept them perfectly.",
  outcomes: {
    good: {
      text: "{hero} chips the crystal from the face, gently, and closes the eyes, and leaves the lamp lit in their lap. The party feels lighter for it.",
      effects: [
        { type: "healParty", percent: 20, text: "The party rests a while beside them" },
        { type: "deed", fact: "goodDeeds" },
      ],
    },
    neutral: {
      text: "{hero} nods to them, as to someone asleep, and the party goes quietly past.",
      effects: [{ type: "healParty", percent: 8 }],
    },
    evil: {
      text: "{hero} breaks off the best of the crystal, Keeper and all, and takes the lamp too. It goes out as soon as it leaves their lap.",
      effects: [
        { type: "loot", table: "grown-keeper", from: "the crystal" },
        { type: "deed", fact: "evilDeeds" },
      ],
    },
  },
});
