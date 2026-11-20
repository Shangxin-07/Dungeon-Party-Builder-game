import { defineMotivation } from "../types";

export default defineMotivation({
  id: "gold",
  name: "Gold",
  blurb: "In it for the money.",
  weight: 1,
  rules: [
    { fact: "goldShare", amount: 1, per: 15, cap: 6, reason: "liked their share of the haul" },
    { fact: "emptyHanded", amount: -6, reason: "came home empty-handed" },
    { fact: "unpaid", amount: -4, reason: "won't work for nothing" },
    { fact: "raiseRefused", amount: -6, reason: "knows what they're worth" },
  ],
  favourites: [
    { building: "vault", weight: 3 },
    { building: "market", weight: 1 },
  ],
  // A greedy hero at low morale lags behind to loot, junk and all.
  lowMorale: { grabJunk: true },
});
