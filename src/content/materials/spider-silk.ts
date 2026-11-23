import { defineMaterial } from "../types";

// Stronger than rope and lighter than canvas: rigging, bedding, bindings.
export default defineMaterial({
  id: "spider-silk",
  name: "Spider silk",
  icon: { sheet: "supplies", cell: 7 },
  blurb: "Cut from the nests on floors 2 and 3.",
  value: 18,
});
