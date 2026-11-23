import { defineMaterial } from "../types";

// Pit props, shack planks and whatever else the miners can spare.
export default defineMaterial({
  id: "timber",
  name: "Timber",
  icon: { sheet: "supplies", cell: 3 },
  blurb: "Salvaged round the camp, and off the raiders' kills.",
  value: 8,
});
