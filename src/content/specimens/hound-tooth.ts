import { defineItem } from "../types";

// A specimen: the Library learns how the tunnel hounds hunt from a tooth.
export default defineItem({
  id: "hound-tooth",
  name: "Hound's Tooth",
  icon: { sheet: "specimens", cell: 7 },
  slot: "loot",
  value: 3,
  tags: ["specimen"],
  research: { points: 6, monsters: ["tunnel-hound"] },
});
