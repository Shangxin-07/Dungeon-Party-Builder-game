import { defineSkill } from "../types";

export default defineSkill({
  id: "scouting",
  name: "Scouting",
  basedOn: ["PER", "DEX"],
  description: "Spot ambushes and traps before they spring.",
});
