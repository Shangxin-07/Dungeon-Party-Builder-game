import { defineAbility } from "../types";

// Tunnel hounds (the Warrens). Goes for the back of the leg, so the pack can close in.
export default defineAbility({
  id: "hamstring",
  name: "Hamstring",
  description: "A bite at the leg: -3 evasion and -4 initiative for 2 turns.",
  verb: "snaps at {target}'s legs",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "hobbled", turns: 2 }],
});
