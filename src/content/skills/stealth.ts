import { defineSkill } from "../types";

// M7.08 (DESIGN.md §17.8): a sneak party is only as quiet as its loudest member.
export default defineSkill({
  id: "stealth",
  name: "Stealth",
  basedOn: ["DEX", "PER"],
  description: "Get past things without being heard. A sneak party goes by its worst.",
});
