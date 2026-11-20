import { definePerk } from "../types";

export default definePerk({
  id: "deep-well",
  name: "Deep Well",
  description: "+10 mana.",
  classes: ["mage"],
  passives: [{ type: "modifyStat", stat: "mana", amount: 10 }],
});
