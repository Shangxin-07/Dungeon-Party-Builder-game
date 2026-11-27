import { defineAbility } from "../types";

// The Coal Halls' great fires (M8.38): Old Bellows and the Banked Fire.
export default defineAbility({
  id: "heat-blast",
  name: "Heat Blast",
  description: "A blast of heat over the whole party, that may daze them.",
  verb: "sends a blast of heat rolling over the party",
  target: "all-enemies",
  cooldown: 2,
  tags: ["damage", "aoe", "fire"],
  effects: [
    { type: "weaponAttack", damagePercent: -20 },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.4 },
  ],
});
