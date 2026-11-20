import { defineAbility } from "../types";

export default defineAbility({
  id: "mend",
  name: "Mend",
  verb: "casts Mend",
  target: "ally",
  cost: 6,
  tags: ["spell", "heal"],
  effects: [{ type: "heal", amount: 4, scale: 0.5 }],
});
