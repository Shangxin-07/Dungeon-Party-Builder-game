import { definePerk } from "../types";

export default definePerk({
  id: "quick-reflexes",
  name: "Quick Reflexes",
  description: "+2 evasion and +2 initiative.",
  classes: [],
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 2 },
    { type: "modifyStat", stat: "initiative", amount: 2 },
  ],
});
