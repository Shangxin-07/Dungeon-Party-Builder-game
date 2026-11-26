import { defineAbility } from "../types";

// Drowned miners (the Flooded Shafts). A cold grip that pulls you down into the water.
export default defineAbility({
  id: "drag-under",
  name: "Drag Under",
  description: "A grab that pulls a hero under: may daze them, and chills them.",
  verb: "grabs {target} and drags them under the water",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff"],
  effects: [
    { type: "weaponAttack" },
    { type: "applyStatus", status: "chilled", turns: 2 },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.3 },
  ],
});
