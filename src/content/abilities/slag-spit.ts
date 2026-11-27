import { defineAbility } from "../types";

// The slag crawler. Molten slag that burns and eats through armour.
export default defineAbility({
  id: "slag-spit",
  name: "Slag Spit",
  description: "Molten slag: fire damage, and -3 armour for 3 turns.",
  verb: "spits molten slag over {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff", "fire"],
  effects: [
    { type: "dealDamage", amount: 10, scale: 0, damageType: "fire" },
    { type: "applyStatus", status: "sundered", turns: 3 },
  ],
});
