import { definePerk } from "../types";

export default definePerk({
  id: "shield-wall",
  name: "Shield Wall",
  description: "+2 armour.",
  classes: ["fighter"],
  passives: [{ type: "modifyStat", stat: "armor", amount: 2 }],
});
