import { defineInjury } from "../types";

export default defineInjury({
  id: "broken-arm",
  name: "Broken arm",
  description: "−3 STR, −2 attack",
  passives: [
    { type: "modifyStat", stat: "STR", amount: -3 },
    { type: "modifyStat", stat: "attack", amount: -2 },
  ],
  days: 6,
  weight: 2,
});
