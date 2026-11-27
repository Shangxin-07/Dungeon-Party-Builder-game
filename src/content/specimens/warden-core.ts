import { defineItem } from "../types";

// A specimen: the carved stone at a warden's middle, where its ward was cut.
export default defineItem({
  id: "warden-core",
  name: "Warden's Ward-stone",
  icon: { sheet: "keepers", cell: 7 },
  slot: "loot",
  value: 8,
  tags: ["specimen"],
  research: { points: 14, monsters: ["stair-warden"] },
});
