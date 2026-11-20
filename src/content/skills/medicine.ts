import { defineSkill } from "../types";

export default defineSkill({
  id: "medicine",
  name: "Medicine",
  basedOn: ["INT", "WIL"],
  description: "Heal between fights and keep downed heroes from bleeding out.",
});
