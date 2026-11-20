import { defineItem } from "../types";

// Weak in a fight. Between fights, a hero with good Medicine gets far more out of them.
export default defineItem({
  id: "bandages",
  name: "Roll of Bandages",
  slot: "consumable",
  value: 5,
  tags: ["heal", "first-aid"],
  use: [{ type: "heal", amount: 8 }],
});
