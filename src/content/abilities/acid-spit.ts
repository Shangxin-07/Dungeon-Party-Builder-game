import { defineAbility } from "../types";

// Older slimes. Eats through armour.
export default defineAbility({
  id: "acid-spit",
  name: "Acid Spit",
  description: "A hit that eats armour: -3 armour for 3 turns.",
  verb: "spits acid at {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "sundered", turns: 3 }],
});
