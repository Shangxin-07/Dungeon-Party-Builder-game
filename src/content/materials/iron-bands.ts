import { defineMaterial } from "../types";

// Hammered out at the Blacksmith (M7.16) from iron ore: straps and hinges for
// a gate that has to hold the stairs.
export default defineMaterial({
  id: "iron-bands",
  name: "Iron bands",
  blurb: "Straps, hinges and bolts from the Blacksmith. They turn a heap of planks into a gate.",
  value: 10,
});
