import { definePerk } from "../types";

export default definePerk({
  id: "pack-mule",
  name: "Pack Mule",
  description: "+2 carry slots.",
  classes: [],
  passives: [{ type: "modifyStat", stat: "carrySlots", amount: 2 }],
});
