import { defineSkill } from "../types";

// M7.07 (DESIGN.md §5, §17.7): what a hero at a Library desk adds each day.
export default defineSkill({
  id: "lore",
  name: "Lore",
  basedOn: ["INT", "PER"],
  description: "Study monsters and strange finds at the Library.",
});
