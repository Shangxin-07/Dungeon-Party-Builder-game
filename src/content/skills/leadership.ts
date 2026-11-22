import { defineSkill } from "../types";

// M7.05 (DESIGN.md §17.5): a leader's command comes from this, and it grows
// with every trip they lead (content/leadership.ts).
export default defineSkill({
  id: "leadership",
  name: "Leadership",
  basedOn: ["CHA", "WIL"],
  description: "Lead a party: more command means more heroes who follow orders.",
});
