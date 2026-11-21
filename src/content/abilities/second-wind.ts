import { defineAbility } from "../types";

// Fighter, level 4. Grit, not magic: no spell power behind it.
export default defineAbility({
  id: "second-wind",
  name: "Second Wind",
  description: "Once a fight, when badly hurt, shrug off 10 HP of damage.",
  verb: "grits their teeth and finds a Second Wind",
  target: "self",
  perFight: 1,
  tags: ["martial", "recover"],
  effects: [{ type: "heal", amount: 10 }],
});
