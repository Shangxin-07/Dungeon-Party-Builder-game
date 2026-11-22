import { defineItem } from "../types";

// The shift's tally stick, notched to the last man. Whatever keeps the Foreman down there is written on it.
export default defineItem({
  id: "foremans-tally",
  name: "Foreman's Tally",
  slot: "loot",
  value: 4,
  tags: ["specimen"],
  research: { points: 25, monsters: ["lost-delver", "foremans-shade"] },
});
