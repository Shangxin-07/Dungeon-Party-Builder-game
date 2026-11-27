import { defineItem } from "../types";

// The Kiln: a lump of glass fired in the Emberstone's heat. It glows faintly for years.
export default defineItem({
  id: "kiln-glass",
  name: "Kiln Glass",
  icon: { sheet: "kiln", cell: 7 },
  slot: "loot",
  value: 150,
  tags: ["gem", "valuable"],
});
