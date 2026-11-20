import { defineInjury } from "../types";

export default defineInjury({
  id: "cracked-ribs",
  name: "Cracked ribs",
  description: "−2 END, −8 HP",
  passives: [
    { type: "modifyStat", stat: "END", amount: -2 },
    { type: "modifyStat", stat: "maxHp", amount: -8 },
  ],
  days: 5,
  weight: 3,
});
