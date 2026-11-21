import { defineAbility } from "../types";

// Ghasts. Tears a wound open that keeps on bleeding.
export default defineAbility({
  id: "rend",
  name: "Rend",
  description: "A heavy hit (130%) that leaves a bleeding wound.",
  verb: "tears into {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["damage"],
  effects: [
    { type: "weaponAttack", damagePercent: 130 },
    { type: "applyStatus", status: "bleeding", turns: 3 },
  ],
});
