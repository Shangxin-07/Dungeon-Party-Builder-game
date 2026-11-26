import { defineAbility } from "../types";

// Goblin sappers (the Diggings). A pouch of the miners' old blasting powder, lit and thrown.
export default defineAbility({
  id: "blasting-powder",
  name: "Blasting Powder",
  description: "Fire damage to every hero, and may daze them.",
  verb: "lights a pouch of blasting powder and throws it",
  target: "all-enemies",
  cooldown: 4,
  tags: ["martial", "fire", "damage", "aoe"],
  effects: [
    { type: "dealDamage", amount: 3, damageType: "fire" },
    { type: "applyStatus", status: "dazed", turns: 1, chance: 0.2 },
  ],
});
