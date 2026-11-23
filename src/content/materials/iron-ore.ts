import { defineMaterial } from "../types";

// What the mine was dug for. Walls, gates and the Blacksmith's forge all want it.
export default defineMaterial({
  id: "iron-ore",
  name: "Iron ore",
  icon: { sheet: "supplies", cell: 5 },
  blurb: "Seams on every floor, and in goblins' pockets.",
  value: 12,
});
