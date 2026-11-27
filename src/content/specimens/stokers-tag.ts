import { defineItem } from "../types";

// A specimen: a scorched brass tag off a stoker's coat, stamped with a mark nobody can read.
export default defineItem({
  id: "stokers-tag",
  name: "Stoker's Tag",
  icon: { sheet: "coal-halls", cell: 8 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 12, monsters: ["stoker"] },
});
