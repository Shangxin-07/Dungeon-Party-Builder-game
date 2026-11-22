import { definePost } from "../types";

// Up on the winding gear with a lamp.
export default definePost({
  id: "lookout",
  name: "Lookout",
  blurb:
    "Someone up on the winding gear sees tomorrow night's climb coming, gets a feel for how busy floor 1 is, and holds back 1 strength.",
  slots: 1,
  effects: [
    { type: "raidWarning", days: 1 },
    { type: "defence", amount: 1 },
    { type: "watch", floors: 1, exact: 0 },
  ],
  porters: true,
});
