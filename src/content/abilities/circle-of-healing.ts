import { defineAbility } from "../types";

// Cleric, level 5. Heals everyone a little; the AI uses it when two or more are hurt.
export default defineAbility({
  id: "circle-of-healing",
  name: "Circle of Healing",
  description: "Heal the whole party a little.",
  verb: "raises a Circle of Healing",
  target: "all-allies",
  cost: 12,
  tags: ["spell", "holy", "heal", "aoe"],
  effects: [{ type: "heal", amount: 3, scale: 0.3 }],
});
