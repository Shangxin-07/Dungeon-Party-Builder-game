import { defineAbility } from "../types";

// The Mire Behemoth (M7.08). Its tail comes round out of the water and takes the front row off its feet.
export default defineAbility({
  id: "tail-sweep",
  name: "Tail Sweep",
  description: "Hits the whole front row and may daze them.",
  verb: "sweeps its tail out of the water",
  target: "all-enemies",
  cooldown: 2,
  tags: ["martial", "damage", "aoe"],
  effects: [
    { type: "weaponAttack", damagePercent: -20 },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.4 },
  ],
});
