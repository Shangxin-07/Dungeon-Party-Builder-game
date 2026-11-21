import { defineAbility } from "../types";

// Ghouls. A rake of filthy claws that leaves the limbs numb.
export default defineAbility({
  id: "ghoul-claw",
  name: "Numbing Claws",
  description: "A hit that may numb (-3 accuracy, -6 initiative for 2 turns).",
  verb: "rakes {target} with numbing claws",
  target: "enemy",
  cooldown: 2,
  tags: ["damage", "debuff"],
  effects: [
    { type: "weaponAttack" },
    { type: "applyStatus", status: "numbed", turns: 2, chance: 0.5 },
  ],
});
