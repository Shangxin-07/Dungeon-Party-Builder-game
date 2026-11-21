import { defineStatus } from "../types";

// Frost in the joints: slow and stiff.
export default defineStatus({
  id: "chilled",
  name: "Chilled",
  passives: [
    { type: "modifyStat", stat: "initiative", amount: -4 },
    { type: "modifyStat", stat: "evasion", amount: -2 },
  ],
});
