import { definePerk } from "../types";

export default definePerk({
  id: "flame-ward",
  name: "Flame Ward",
  description: "+3 resist and 30% fire resistance.",
  classes: ["mage"],
  minLevel: 3,
  passives: [
    { type: "modifyStat", stat: "resist", amount: 3 },
    { type: "resist", damageType: "fire", percent: 30 },
  ],
});
