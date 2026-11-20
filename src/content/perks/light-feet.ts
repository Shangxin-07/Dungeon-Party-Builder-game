import { definePerk } from "../types";

export default definePerk({
  id: "light-feet",
  name: "Light Feet",
  description: "+3 evasion and +3 initiative.",
  classes: ["scout"],
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 3 },
    { type: "modifyStat", stat: "initiative", amount: 3 },
  ],
});
