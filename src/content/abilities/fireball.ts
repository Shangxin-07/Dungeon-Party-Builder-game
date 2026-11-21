import { defineAbility } from "../types";

// Mage, level 7. Flame Wave's big sister: costs a lot more, hits a lot harder.
export default defineAbility({
  id: "fireball",
  name: "Fireball",
  description: "Fire damage to every monster.",
  verb: "hurls a Fireball",
  target: "all-enemies",
  cost: 16,
  tags: ["spell", "fire", "damage", "aoe"],
  effects: [{ type: "dealDamage", amount: 4, scale: 0.4, damageType: "fire" }],
});
