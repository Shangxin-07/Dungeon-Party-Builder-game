import { defineStatus } from "../types";

// A wight's touch takes the strength out of the living for a while.
export default defineStatus({
  id: "drained",
  name: "Drained",
  passives: [
    { type: "modifyStat", stat: "attack", amount: -2 },
    { type: "modifyStat", stat: "spellPower", amount: -2 },
  ],
});
