import { defineAbility } from "../types";

// Daggers. Small blade, nasty place.
export default defineAbility({
  id: "backstab",
  name: "Backstab",
  description: "+80% damage.",
  verb: "slips a dagger into {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage"],
  effects: [{ type: "weaponAttack", damagePercent: 80 }],
});
