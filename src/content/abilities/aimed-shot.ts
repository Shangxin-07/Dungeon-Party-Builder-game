import { defineAbility } from "../types";

// Bows. Take a breath, then let go.
export default defineAbility({
  id: "aimed-shot",
  name: "Aimed Shot",
  description: "+60% damage.",
  verb: "lines up an Aimed Shot at {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage"],
  effects: [{ type: "weaponAttack", damagePercent: 60 }],
});
