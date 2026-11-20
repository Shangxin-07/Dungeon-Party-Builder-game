import { defineInjury } from "../types";

export default defineInjury({
  id: "concussion",
  name: "Concussion",
  description: "−3 INT, −3 PER",
  passives: [
    { type: "modifyStat", stat: "INT", amount: -3 },
    { type: "modifyStat", stat: "PER", amount: -3 },
  ],
  days: 6,
  weight: 2,
});
