import { defineItem } from "../types";

// A specimen: a cinder that won't go out, shut in a little iron box. It flickers.
export default defineItem({
  id: "dancer-cinder",
  name: "Dancing Cinder",
  icon: { sheet: "kiln", cell: 10 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 15, monsters: ["flame-dancer"] },
});
