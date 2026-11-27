import { defineItem } from "../types";

// A specimen: a wick that lights itself, taken from a lamplighter's hook.
export default defineItem({
  id: "lamp-wick",
  name: "Lamplighter's Wick",
  icon: { sheet: "coal-halls", cell: 10 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 12, monsters: ["lamplighter"] },
});
