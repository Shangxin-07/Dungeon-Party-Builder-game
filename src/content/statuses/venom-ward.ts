import { defineStatus } from "../types";

// Antivenom in the blood: spider bites do nothing for a while.
export default defineStatus({
  id: "venom-ward",
  name: "Warded against venom",
  passives: [{ type: "resist", damageType: "poison", percent: 100 }],
});
