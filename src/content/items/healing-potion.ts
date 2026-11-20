import { defineItem } from "../types";

export default defineItem({
  id: "healing-potion",
  name: "Healing Potion",
  slot: "consumable",
  value: 25,
  tags: ["potion", "heal"],
  use: [{ type: "heal", amount: 20 }],
});
