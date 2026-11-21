import { defineAbility } from "../types";

// Axes. Hits the whole front row.
export default defineAbility({
  id: "cleave",
  name: "Cleave",
  description: "Hit the whole front row at 75% damage.",
  verb: "swings a wide Cleave",
  target: "all-enemies",
  cooldown: 3,
  tags: ["martial", "damage", "aoe"],
  effects: [{ type: "weaponAttack", damagePercent: -25 }],
});
