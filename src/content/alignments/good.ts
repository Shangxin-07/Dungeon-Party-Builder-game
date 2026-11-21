import { defineAlignment } from "../types";

export default defineAlignment({
  id: "good",
  name: "Good",
  blurb: "Looks after the weak, and can't bear to leave anyone behind.",
  position: 1,
  weight: 35,
  rules: [
    { fact: "fallenComrades", amount: -2, cap: 6, reason: "couldn't save them" },
    { fact: "abandoned", amount: -3, cap: 6, reason: "nobody went back for them" },
    { fact: "rescuedComrades", amount: 3, cap: 6, reason: "did the right thing" },
  ],
});
