import { definePerk } from "../types";

export default definePerk({
  id: "thick-skinned",
  name: "Thick-skinned",
  description: "+2 END and 20% poison resistance.",
  classes: ["fighter"],
  minLevel: 3,
  passives: [
    { type: "modifyStat", stat: "END", amount: 2 },
    { type: "resist", damageType: "poison", percent: 20 },
  ],
});
