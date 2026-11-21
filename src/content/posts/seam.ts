import { definePost } from "../types";

// The mine's owners still buy ore by the tub, even with monsters at the door.
// Once the guild takes over the pit, the mine is closed for good: camp only,
// so a guild that never goes down still runs out of gold.
export default definePost({
  id: "seam",
  name: "Work the seam",
  blurb:
    "Dig at the near seam. The mine's owners pay for every tub, and some ore is worth keeping.",
  slots: 2,
  effects: [{ type: "gather", loot: "seam-work", rolls: 2 }],
  porters: true,
  campOnly: true,
});
