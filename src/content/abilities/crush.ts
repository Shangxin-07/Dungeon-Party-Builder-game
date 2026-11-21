import { defineAbility } from "../types";

// Maces. Dents armour so everyone hits harder.
export default defineAbility({
  id: "crush",
  name: "Crush",
  description: "A blow that cracks armour: -3 armour for 3 turns.",
  verb: "brings a crushing blow down on {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "sundered", turns: 3 }],
});
