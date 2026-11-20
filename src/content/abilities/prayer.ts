import { defineAbility } from "../types";

// Stronger than a mage's Mend, but a cleric has less spell power to put behind it.
export default defineAbility({
  id: "prayer",
  name: "Prayer of Mending",
  verb: "prays over",
  target: "ally",
  cost: 6,
  tags: ["spell", "holy", "heal"],
  effects: [{ type: "heal", amount: 7, scale: 0.5 }],
});
