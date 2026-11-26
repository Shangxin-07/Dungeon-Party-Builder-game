import { defineStatus } from "../types";

// A hound's bite at the back of the leg.
export default defineStatus({
  id: "hobbled",
  name: "Hobbled",
  passives: [
    { type: "modifyStat", stat: "evasion", amount: -3 },
    { type: "modifyStat", stat: "initiative", amount: -4 },
  ],
});
