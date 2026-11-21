import { defineMotivation } from "../types";

export default defineMotivation({
  id: "comrades",
  name: "Comrades",
  blurb: "Fights for the people next to them.",
  weight: 1,
  rules: [
    { fact: "allHome", amount: 3, reason: "everyone came home" },
    { fact: "fallenComrades", amount: -6, cap: 18, reason: "lost friends" },
    { fact: "abandoned", amount: -6, cap: 12, reason: "a friend died waiting for rescue" },
    { fact: "rescuedComrades", amount: 6, cap: 12, reason: "brought friends home" },
    { fact: "buriedComrade", amount: 4, cap: 8, reason: "a friend got a proper burial" },
  ],
  favourites: [
    { building: "tavern", weight: 3 },
    { building: "guild-hall", weight: 1 },
  ],
});
