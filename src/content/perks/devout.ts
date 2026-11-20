import { definePerk } from "../types";

export default definePerk({
  id: "devout",
  name: "Devout",
  description: "+3 spell power and +6 mana.",
  classes: ["cleric"],
  passives: [
    { type: "modifyStat", stat: "spellPower", amount: 3 },
    { type: "modifyStat", stat: "mana", amount: 6 },
  ],
});
