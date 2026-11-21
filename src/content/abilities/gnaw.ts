import { defineAbility } from "../types";

// Deeper-down rats. A bite that keeps bleeding.
export default defineAbility({
  id: "gnaw",
  name: "Gnaw",
  description: "A bite that may leave a bleeding wound (2 damage a turn).",
  verb: "gnaws at {target}",
  target: "enemy",
  cooldown: 2,
  tags: ["damage"],
  effects: [
    { type: "weaponAttack" },
    { type: "applyStatus", status: "bleeding", turns: 3, chance: 0.5 },
  ],
});
