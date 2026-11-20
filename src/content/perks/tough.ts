import { definePerk } from "../types";

export default definePerk({
  id: "tough",
  name: "Tough",
  description: "+10 max HP.",
  classes: [],
  passives: [{ type: "modifyStat", stat: "maxHp", amount: 10 }],
});
