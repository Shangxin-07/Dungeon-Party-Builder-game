import { defineAbility } from "../types";

// Fighter, level 1. A big two-handed swing with whatever's in hand.
export default defineAbility({
  id: "power-strike",
  name: "Power Strike",
  description: "A heavy blow: +50% damage.",
  verb: "puts everything into a Power Strike on {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage"],
  effects: [{ type: "weaponAttack", damagePercent: 50 }],
});
