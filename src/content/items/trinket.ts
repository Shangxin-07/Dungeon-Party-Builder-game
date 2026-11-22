import { defineItem } from "../types";

export default defineItem({
  id: "trinket",
  name: "Strange Trinket",
  slot: "loot",
  value: 20,
  valueRange: [2, 120],
  tags: ["unidentified"],
  // M7.07: the Library can work out what it really is.
  research: { points: 20, becomes: "trinket-identified" },
});
