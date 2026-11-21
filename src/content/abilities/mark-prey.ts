import { defineAbility } from "../types";

// Scout, level 1. A hit that shows the whole party where to aim.
export default defineAbility({
  id: "mark-prey",
  name: "Mark Prey",
  description: "A normal hit that marks the foe: -5 evasion for 3 turns, so everyone hits it.",
  verb: "marks {target} for the others",
  target: "enemy",
  cooldown: 4,
  tags: ["martial", "damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "marked", turns: 3 }],
});
