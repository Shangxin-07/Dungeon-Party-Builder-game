import { defineAbility } from "../types";

// Spellblade, level 1. The blade catches fire for one swing.
export default defineAbility({
  id: "flame-blade",
  name: "Flame Blade",
  description: "A weapon hit that burns: +20% damage, plus fire damage from spell power.",
  verb: "sets their blade alight and cuts into {target}",
  target: "enemy",
  cooldown: 2,
  tags: ["martial", "fire", "damage"],
  effects: [
    { type: "weaponAttack", damagePercent: 20 },
    { type: "dealDamage", amount: 2, scale: 0.4, damageType: "fire" },
  ],
});
