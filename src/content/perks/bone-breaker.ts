import { definePerk } from "../types";

export default definePerk({
  id: "bone-breaker",
  name: "Bone Breaker",
  description: "+25% damage against undead.",
  classes: ["fighter"],
  passives: [{ type: "bonusVsTag", tag: "undead", percent: 25 }],
});
