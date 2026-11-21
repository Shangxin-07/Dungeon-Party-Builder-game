import { defineStatus } from "../types";

// Stuck in spider silk: slow and easy to bite.
export default defineStatus({
  id: "webbed",
  name: "Webbed",
  passives: [
    { type: "modifyStat", stat: "evasion", amount: -4 },
    { type: "modifyStat", stat: "initiative", amount: -6 },
  ],
});
