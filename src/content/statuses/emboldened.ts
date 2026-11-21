import { defineStatus } from "../types";

// Fired up by a leader's war cry.
export default defineStatus({
  id: "emboldened",
  name: "Emboldened",
  passives: [
    { type: "modifyStat", stat: "attack", amount: 3 },
    { type: "modifyStat", stat: "accuracy", amount: 2 },
  ],
});
