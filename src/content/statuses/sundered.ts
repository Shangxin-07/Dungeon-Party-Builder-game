import { defineStatus } from "../types";

// Armour cracked or knocked askew.
export default defineStatus({
  id: "sundered",
  name: "Sundered",
  passives: [{ type: "modifyStat", stat: "armor", amount: -3 }],
});
