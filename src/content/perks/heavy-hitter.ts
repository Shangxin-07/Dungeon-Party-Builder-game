import { definePerk } from "../types";

export default definePerk({
  id: "heavy-hitter",
  name: "Heavy Hitter",
  description: "+2 attack.",
  classes: ["fighter"],
  passives: [{ type: "modifyStat", stat: "attack", amount: 2 }],
});
