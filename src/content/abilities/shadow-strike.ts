import { defineAbility } from "../types";

// Assassin, level 1. Double damage, and it keeps bleeding.
export default defineAbility({
  id: "shadow-strike",
  name: "Shadow Strike",
  description: "+100% damage, and the target bleeds.",
  verb: "steps out of nowhere and strikes {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage"],
  effects: [
    { type: "weaponAttack", damagePercent: 100 },
    { type: "applyStatus", status: "bleeding", turns: 3 },
  ],
});
