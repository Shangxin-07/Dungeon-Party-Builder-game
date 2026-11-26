import { defineEvent } from "../types";

// The Bone Halls: someone still grieving, long after.
export default defineEvent({
  id: "mourning-ghost",
  name: "The mourner",
  floors: [3, 3],
  weight: 1,
  intro:
    "A pale woman kneels by a niche, weeping over bones nobody ever named. She doesn't look up.",
  outcomes: {
    good: {
      text: "{hero} kneels beside her and says the old words over the bones. She fades, smiling, and the party feels lighter for it.",
      effects: [
        { type: "deed", fact: "goodDeeds" },
        { type: "healParty", percent: 15 },
      ],
    },
    neutral: {
      text: "{hero} leaves a coin in the niche, and the party goes quietly by.",
      effects: [],
    },
    evil: {
      text: "{hero} takes the grave goods from under her hands. Her wail follows the party a long way.",
      effects: [
        { type: "loot", table: "grave-goods", from: "the niche" },
        { type: "deed", fact: "evilDeeds" },
        { type: "hurt", damage: [2, 4], damageType: "cold", hits: "all" },
      ],
    },
  },
});
