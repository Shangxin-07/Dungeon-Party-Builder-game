import { defineItem } from "../types";

// The Coal Halls: coal from the Keepers' fires. It never quite goes out.
export default defineItem({
  id: "banked-coal",
  name: "Banked Coal",
  icon: { sheet: "coal-halls", cell: 6 },
  slot: "loot",
  value: 75,
  tags: ["valuable"],
});
