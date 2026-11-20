import { defineSkill } from "../types";

export default defineSkill({
  id: "appraisal",
  name: "Appraisal",
  basedOn: ["PER", "INT"],
  description: "Know what loot is really worth and keep the best when packs are full.",
});
