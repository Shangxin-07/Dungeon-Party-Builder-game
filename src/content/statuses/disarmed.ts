import { defineStatus } from "../types";

// Weapon knocked aside: weaker blows until it gets a proper grip again.
export default defineStatus({
  id: "disarmed",
  name: "Disarmed",
  passives: [{ type: "modifyStat", stat: "attack", amount: -4 }],
});
