import { defineAbility } from "../types";

// The prism wisp. It splits its own light into someone's eyes.
export default defineAbility({
  id: "refraction",
  name: "Refraction",
  description: "Splits light into one hero's eyes: a little holy damage, and they may be dazed.",
  verb: "splits its light into {target}'s eyes",
  target: "enemy",
  cost: 6,
  tags: ["spell", "holy", "damage"],
  effects: [
    { type: "dealDamage", amount: 4, scale: 0.5, damageType: "holy" },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.4 },
  ],
});
