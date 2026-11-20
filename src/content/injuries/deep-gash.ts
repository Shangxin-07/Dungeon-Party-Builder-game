import { defineInjury } from "../types";

export default defineInjury({
  id: "deep-gash",
  name: "Deep gash",
  description: "−12 HP",
  passives: [{ type: "modifyStat", stat: "maxHp", amount: -12 }],
  days: 5,
  weight: 3,
});
