import { defineItem } from "../types";

// Brewed from glowcap at the Apothecary.
export default defineItem({
  id: "greater-healing-potion",
  name: "Greater Healing Potion",
  slot: "consumable",
  value: 45,
  tags: ["potion", "heal"],
  use: [{ type: "heal", amount: 40 }],
});
