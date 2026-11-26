import { defineItem } from "../types";

// The Apothecary's answer to the Warrens: a bitter draught that heals a little and stops spider venom.
export default defineItem({
  id: "antivenom",
  name: "Antivenom",
  slot: "consumable",
  value: 15,
  tags: ["potion", "heal"],
  use: [
    { type: "heal", amount: 8 },
    { type: "applyStatus", status: "venom-ward", turns: 5 },
  ],
});
