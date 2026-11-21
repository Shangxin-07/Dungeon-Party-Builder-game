import { defineStatus } from "../types";

// A ghoul's claws leave the limbs cold and slow.
export default defineStatus({
  id: "numbed",
  name: "Numbed",
  passives: [
    { type: "modifyStat", stat: "accuracy", amount: -3 },
    { type: "modifyStat", stat: "initiative", amount: -6 },
  ],
});
