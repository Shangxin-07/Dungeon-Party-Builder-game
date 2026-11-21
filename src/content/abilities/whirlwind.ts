import { defineAbility } from "../types";

// Fighter, level 7. Hits every monster in the front row.
export default defineAbility({
  id: "whirlwind",
  name: "Whirlwind",
  description: "Spin and hit the whole front row at 80% damage.",
  verb: "spins into a Whirlwind",
  target: "all-enemies",
  cooldown: 4,
  tags: ["martial", "damage", "aoe"],
  effects: [{ type: "weaponAttack", damagePercent: -20 }],
});
