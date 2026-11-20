import { defineItem } from "../types";

// Weak in a fight. Between fights, Medicine will make them better (M2).
export default defineItem({
  id: "bandages",
  name: "Bandages",
  slot: "consumable",
  value: 5,
  tags: ["heal"],
  use: [{ type: "heal", amount: 8 }],
});
