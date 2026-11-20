import { definePerk } from "../types";

export default definePerk({
  id: "keen-eye",
  name: "Keen Eye",
  description: "+15 Scouting and +10 Appraisal.",
  classes: ["scout"],
  passives: [
    { type: "modifySkill", skill: "scouting", amount: 15 },
    { type: "modifySkill", skill: "appraisal", amount: 10 },
  ],
});
