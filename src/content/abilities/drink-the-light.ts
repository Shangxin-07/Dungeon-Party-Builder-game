import { defineAbility } from "../types";

// The Lightdrinker. The crystal round it goes dark, and its wounds close.
export default defineAbility({
  id: "drink-the-light",
  name: "Drink the Light",
  description: "Drinks the light out of the crystal round it and heals.",
  verb: "drinks the light out of the crystal, and the hall goes dark round it",
  target: "self",
  cooldown: 4,
  tags: ["heal"],
  effects: [{ type: "heal", amount: 50, scale: 0 }],
});
