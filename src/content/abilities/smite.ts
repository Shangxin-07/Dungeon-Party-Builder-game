import { defineAbility } from "../types";

export default defineAbility({
  id: "smite",
  name: "Smite",
  verb: "calls down a Smite on",
  target: "enemy",
  cost: 5,
  tags: ["spell", "holy", "damage"],
  effects: [{ type: "dealDamage", amount: 4, scale: 0.5, damageType: "holy" }],
});
