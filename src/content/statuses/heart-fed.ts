import { defineStatus } from "../types";

// The Hearthstone's heart pours life into its guardian (M8.22): wounds close fast.
export default defineStatus({
  id: "heart-fed",
  name: "Heart-fed",
  perTurn: [{ type: "heal", amount: 25 }],
});
