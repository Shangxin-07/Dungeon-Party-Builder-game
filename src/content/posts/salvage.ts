import { definePost } from "../types";

// Pull down the shacks nobody needs, dig props out of the old workings.
export default definePost({
  id: "salvage",
  name: "Salvage crew",
  blurb: "Strip the camp for timber and dig ore out of the spoil heaps, every day.",
  slots: 3,
  effects: [{ type: "gather", loot: "camp-salvage", rolls: 1 }],
  porters: true,
  settlers: true,
});
