import { definePerk } from "../types";

export default definePerk({
  id: "trap-sense",
  name: "Trap Sense",
  description: "+20 Scouting.",
  classes: ["scout"],
  minLevel: 3,
  passives: [{ type: "modifySkill", skill: "scouting", amount: 20 }],
});
