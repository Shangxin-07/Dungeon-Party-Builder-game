import { defineAbility } from "../types";

// Spellblade, level 4. A shimmer of force when things get bad.
export default defineAbility({
  id: "arcane-ward",
  name: "Arcane Ward",
  description: "Once a fight, when badly hurt: heals some HP from spell power.",
  verb: "throws up an Arcane Ward",
  target: "self",
  perFight: 1,
  tags: ["recover"],
  effects: [{ type: "heal", amount: 6, scale: 0.8 }],
});
