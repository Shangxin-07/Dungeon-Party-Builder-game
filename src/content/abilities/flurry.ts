import { defineAbility } from "../types";

// Scout, level 5. Two quick hits; a miss ends the flurry.
export default defineAbility({
  id: "flurry",
  name: "Flurry",
  description: "Two quick attacks at 65% damage each.",
  verb: "lets fly a Flurry at {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage"],
  effects: [
    { type: "weaponAttack", damagePercent: -35 },
    { type: "weaponAttack", damagePercent: -35 },
  ],
});
