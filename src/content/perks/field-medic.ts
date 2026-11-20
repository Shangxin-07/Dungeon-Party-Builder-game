import { definePerk } from "../types";

export default definePerk({
  id: "field-medic",
  name: "Field Medic",
  description: "+15 Medicine.",
  classes: [],
  passives: [{ type: "modifySkill", skill: "medicine", amount: 15 }],
});
