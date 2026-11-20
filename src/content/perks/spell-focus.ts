import { definePerk } from "../types";

export default definePerk({
  id: "spell-focus",
  name: "Spell Focus",
  description: "+2 spell power.",
  classes: ["mage"],
  passives: [{ type: "modifyStat", stat: "spellPower", amount: 2 }],
});
