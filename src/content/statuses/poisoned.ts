import { defineStatus } from "../types";

export default defineStatus({
  id: "poisoned",
  name: "Poisoned",
  perTurn: [{ type: "dealDamage", amount: 2, damageType: "poison" }],
});
