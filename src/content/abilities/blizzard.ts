import { defineAbility } from "../types";

// Frost Mage, level 1. The whole room goes white.
export default defineAbility({
  id: "blizzard",
  name: "Blizzard",
  description: "Cold damage to every enemy, and may chill them.",
  verb: "calls down a Blizzard",
  target: "all-enemies",
  cost: 14,
  tags: ["spell", "cold", "damage", "aoe"],
  effects: [
    { type: "dealDamage", amount: 3, scale: 0.35, damageType: "cold" },
    { type: "applyStatus", status: "chilled", turns: 2, chance: 0.5 },
  ],
});
