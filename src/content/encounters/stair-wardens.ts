import { defineEncounter } from "../types";

// The Keepers' Stair: a warden on its round, with an echo tending it.
export default defineEncounter({
  id: "stair-wardens",
  floors: [6, 6],
  weight: 1,
  groups: [
    { monster: "stair-warden", count: [1, 1] },
    { monster: "keepers-echo", count: [1, 1] },
  ],
});
