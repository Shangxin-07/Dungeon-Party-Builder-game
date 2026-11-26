import { defineAbility } from "../types";

// Rust beetles (the Diggings). Its bite eats iron: armour flakes away where it chews.
export default defineAbility({
  id: "rust-bite",
  name: "Rust Bite",
  description: "A bite that rusts armour: -3 armour for 4 turns.",
  verb: "chews at {target}'s armour",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "sundered", turns: 4 }],
});
