import { defineAbility } from "../types";

// Swords. A cut that knocks the foe's weapon aside.
export default defineAbility({
  id: "disarm",
  name: "Disarm",
  description: "A normal hit that also knocks the foe's weapon aside: -4 attack for 2 turns.",
  verb: "goes for {target}'s weapon",
  target: "enemy",
  cooldown: 3,
  tags: ["martial", "damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "disarmed", turns: 2 }],
});
