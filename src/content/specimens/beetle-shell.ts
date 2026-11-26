import { defineItem } from "../types";

// A specimen: the Library learns how rust beetles eat iron from a cracked shell.
export default defineItem({
  id: "beetle-shell",
  name: "Rust Beetle Shell",
  icon: { sheet: "specimens", cell: 6 },
  slot: "loot",
  value: 3,
  tags: ["specimen"],
  research: { points: 6, monsters: ["rust-beetle"] },
});
