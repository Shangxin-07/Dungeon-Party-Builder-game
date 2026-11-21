import { defineStatus } from "../types";

// An open wound: a little damage every turn.
export default defineStatus({
  id: "bleeding",
  name: "Bleeding",
  perTurn: [{ type: "dealDamage", amount: 2, damageType: "slashing" }],
});
