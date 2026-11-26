import { defineItem } from "../types";

// A specimen: a drowned miner's brass tag, with a number and a name. The Library learns who they were, and how they fight.
export default defineItem({
  id: "miners-tag",
  name: "Miner's Tag",
  slot: "loot",
  value: 4,
  tags: ["specimen"],
  research: { points: 8, monsters: ["drowned-miner"] },
});
