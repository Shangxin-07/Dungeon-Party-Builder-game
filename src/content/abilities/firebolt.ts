import { defineAbility } from "../types";

export default defineAbility({
  id: "firebolt",
  name: "Firebolt",
  verb: "hurls a Firebolt",
  target: "enemy",
  cost: 5,
  tags: ["spell", "fire", "damage"],
  effects: [{ type: "dealDamage", amount: 3, scale: 0.5, damageType: "fire" }],
});
