import { defineInjury } from "../types";

export default defineInjury({
  id: "twisted-ankle",
  name: "Twisted ankle",
  description: "−3 DEX, −3 evasion",
  passives: [
    { type: "modifyStat", stat: "DEX", amount: -3 },
    { type: "modifyStat", stat: "evasion", amount: -3 },
  ],
  days: 5,
  weight: 3,
});
