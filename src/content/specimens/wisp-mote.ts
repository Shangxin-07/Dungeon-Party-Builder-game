import { defineItem } from "../types";

// A specimen: a mote of light caught in a little glass bottle. It's still moving.
export default defineItem({
  id: "wisp-mote",
  name: "Bottled Wisp-light",
  icon: { sheet: "glimmering", cell: 9 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 12, monsters: ["prism-wisp"] },
});
