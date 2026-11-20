import { defineAbility } from "../types";

export default defineAbility({
  id: "flame-wave",
  name: "Flame Wave",
  verb: "casts Flame Wave",
  target: "all-enemies",
  cost: 10,
  tags: ["spell", "fire", "damage", "aoe"],
  effects: [{ type: "dealDamage", amount: 2, scale: 0.25, damageType: "fire" }],
});
