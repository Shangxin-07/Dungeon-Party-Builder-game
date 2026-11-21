import { defineAlignment } from "../types";

// Neutral heroes keep the peace: one step from both Good and Evil, so a
// Neutral majority can take either (DESIGN.md §7).
export default defineAlignment({
  id: "neutral",
  name: "Neutral",
  blurb: "Gets the job done and keeps out of other people's quarrels.",
  position: 0,
  weight: 40,
  rules: [],
});
