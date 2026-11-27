import { defineAbility } from "../types";

// The Facet King. It cracks itself open, and the splinters fly.
export default defineAbility({
  id: "glass-storm",
  name: "Glass Storm",
  description: "A burst of crystal splinters over the whole party.",
  verb: "cracks itself open, and splinters of crystal fly through the party",
  target: "all-enemies",
  cooldown: 3,
  tags: ["damage", "aoe"],
  effects: [{ type: "dealDamage", amount: 14, scale: 0, damageType: "piercing" }],
});
