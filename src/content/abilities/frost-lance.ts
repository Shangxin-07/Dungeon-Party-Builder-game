import { defineAbility } from "../types";

// Mage, level 4. A little more than a Firebolt, and it slows.
export default defineAbility({
  id: "frost-lance",
  name: "Frost Lance",
  description: "Cold damage, and chills the target (slower, easier to hit).",
  verb: "drives a Frost Lance into {target}",
  target: "enemy",
  cost: 7,
  tags: ["spell", "cold", "damage"],
  effects: [
    { type: "dealDamage", amount: 3, scale: 0.5, damageType: "cold" },
    { type: "applyStatus", status: "chilled", turns: 2 },
  ],
});
