import { defineAbility } from "../types";

// Wights (the Bone Halls). A cold hand that takes the strength out of you.
export default defineAbility({
  id: "wight-touch",
  name: "Wight's Touch",
  description: "A cold touch that drains: -2 attack and -2 spell power for 3 turns.",
  verb: "lays a cold hand on {target}",
  target: "enemy",
  cooldown: 3,
  tags: ["damage", "debuff"],
  effects: [{ type: "weaponAttack" }, { type: "applyStatus", status: "drained", turns: 3 }],
});
