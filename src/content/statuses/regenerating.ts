import { defineStatus } from "../types";

// Troll flesh knits while you watch. Fire stops it best: kill it fast.
export default defineStatus({
  id: "regenerating",
  name: "Regenerating",
  perTurn: [{ type: "heal", amount: 6 }],
});
