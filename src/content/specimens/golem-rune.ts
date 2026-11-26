import { defineItem } from "../types";

// A specimen: a rune-cut stone from inside an ore golem. Somebody cut it, long before the miners.
export default defineItem({
  id: "golem-rune",
  name: "Golem's Rune-stone",
  slot: "loot",
  value: 6,
  tags: ["specimen"],
  research: { points: 12, monsters: ["ore-golem"] },
});
