import { defineItem } from "../types";

// Woven from Warrens silk by someone who didn't come back for it. Light, and hard to get a grip on.
export default defineItem({
  id: "silk-cloak",
  name: "Silk Cloak",
  slot: "armor",
  value: 45,
  tags: ["armor", "light", "silk"],
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "modifyStat", stat: "evasion", amount: 3 },
  ],
});
