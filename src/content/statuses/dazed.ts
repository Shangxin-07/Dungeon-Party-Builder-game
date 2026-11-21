import { defineStatus } from "../types";

// Rung like a bell.
export default defineStatus({
  id: "dazed",
  name: "Dazed",
  passives: [
    { type: "modifyStat", stat: "accuracy", amount: -4 },
    { type: "modifyStat", stat: "initiative", amount: -4 },
  ],
});
