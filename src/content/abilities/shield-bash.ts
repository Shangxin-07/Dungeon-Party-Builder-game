import { defineAbility } from "../types";

// Shields. A lighter hit, but it rings their bell.
export default defineAbility({
  id: "shield-bash",
  name: "Shield Bash",
  description: "75% damage, and dazes for 2 turns (-4 accuracy and initiative).",
  verb: "slams a shield into {target}",
  target: "enemy",
  cooldown: 4,
  tags: ["martial", "damage", "debuff"],
  effects: [
    { type: "weaponAttack", damagePercent: -25 },
    { type: "applyStatus", status: "dazed", turns: 2 },
  ],
});
