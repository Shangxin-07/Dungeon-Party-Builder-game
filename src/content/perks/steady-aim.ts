import { definePerk } from "../types";

export default definePerk({
  id: "steady-aim",
  name: "Steady Aim",
  description: "+3 accuracy and +1 attack.",
  classes: ["scout"],
  passives: [
    { type: "modifyStat", stat: "accuracy", amount: 3 },
    { type: "modifyStat", stat: "attack", amount: 1 },
  ],
});
