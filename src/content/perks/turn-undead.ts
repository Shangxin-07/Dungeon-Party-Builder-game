import { definePerk } from "../types";

export default definePerk({
  id: "turn-undead",
  name: "Turn Undead",
  description: "+40% damage against the undead.",
  classes: ["cleric"],
  minLevel: 3,
  passives: [{ type: "bonusVsTag", tag: "undead", percent: 40 }],
});
