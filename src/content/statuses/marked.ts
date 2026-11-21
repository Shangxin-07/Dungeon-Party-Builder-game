import { defineStatus } from "../types";

// Pointed out to the whole party: easier for everyone to hit.
export default defineStatus({
  id: "marked",
  name: "Marked",
  passives: [{ type: "modifyStat", stat: "evasion", amount: -5 }],
});
