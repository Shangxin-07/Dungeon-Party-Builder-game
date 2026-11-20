import { definePerk } from "../types";

export default definePerk({
  id: "sharp-eyed",
  name: "Sharp-eyed",
  description: "+15 Appraisal.",
  classes: [],
  passives: [{ type: "modifySkill", skill: "appraisal", amount: 15 }],
});
