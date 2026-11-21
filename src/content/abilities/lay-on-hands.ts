import { defineAbility } from "../types";

// Paladin, level 3. No mana, just faith, once a fight.
export default defineAbility({
  id: "lay-on-hands",
  name: "Lay on Hands",
  description: "Once a fight: a big heal on one ally, no mana needed.",
  verb: "lays hands on",
  target: "ally",
  perFight: 1,
  tags: ["heal"],
  effects: [{ type: "heal", amount: 10, scale: 0.6 }],
});
