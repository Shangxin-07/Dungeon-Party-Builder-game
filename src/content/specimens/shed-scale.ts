import { defineItem } from "../types";

// Big as a shield and harder than one. Fetched from the Mire Behemoth's wallow
// by a sneak party (M7.08): the Library learns from it how to get under the hide.
export default defineItem({
  id: "shed-scale",
  name: "Shed Scale",
  icon: { sheet: "specimens", cell: 4 },
  slot: "loot",
  value: 25,
  size: 2,
  tags: ["specimen"],
  research: { points: 30, monsters: ["mire-behemoth"] },
});
