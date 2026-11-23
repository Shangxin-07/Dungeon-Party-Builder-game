import { defineMaterial } from "../types";

// Sawn at the Sawmill (M7.14): two planks from a log of timber.
export default defineMaterial({
  id: "planks",
  name: "Planks",
  icon: { sheet: "supplies", cell: 4 },
  blurb: "Sawn from timber at the Sawmill. What anything bigger than a shack is built from.",
  value: 6,
});
