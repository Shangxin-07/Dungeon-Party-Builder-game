import { defineAbility } from "../types";

// Paladin, level 1. Steel and scripture.
export default defineAbility({
  id: "holy-strike",
  name: "Holy Strike",
  description: "A weapon hit plus holy damage from spell power.",
  verb: "brings a Holy Strike down on {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "holy", "damage"],
  effects: [
    { type: "weaponAttack" },
    { type: "dealDamage", amount: 3, scale: 0.4, damageType: "holy" },
  ],
});
